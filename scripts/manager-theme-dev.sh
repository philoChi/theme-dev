#!/bin/bash

# Shopify Theme Development Manager
# A comprehensive management system for Shopify theme development servers
# 
# Key Features:
# - Start multiple theme dev servers on different ports
# - Stop individual servers by port/PID or one at a time
# - List and monitor all running servers
# - Robust process management with graceful shutdown
#
# Author: Claude Code
# Version: 2.1.0

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly THEME_DIR="$PROJECT_ROOT/theme-hyspex"
readonly PID_DIR="$HOME/.theme-dev-pids"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly CONFIG_FILE="$PROJECT_ROOT/.theme-dev-config"
readonly LOCK_FILE="$PROJECT_ROOT/.theme-dev.lock"
readonly WORKING_URL_FILE="$PROJECT_ROOT/working-url.md"

# Default configuration
readonly DEFAULT_PORTS=(9292 43091 44573 35673 32891 41234 38921 47562)
readonly SHOPIFY_STORE="nookleaf-dev.myshopify.com"
readonly MAX_STARTUP_WAIT=30
readonly HEALTH_CHECK_TIMEOUT=5

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Initialize directories
init_directories() {
    mkdir -p "$PID_DIR" "$LOG_DIR"
    
    # Create default config if it doesn't exist
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << EOF
# Theme Development Manager Configuration
STORE="$SHOPIFY_STORE"
DEFAULT_PORT=9292
LOG_RETENTION_DAYS=7
AUTO_CLEANUP=true
HEALTH_CHECK_INTERVAL=30
EOF
    fi
}

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1" >&2
    fi
}

# Lock management
acquire_lock() {
    local timeout=${1:-10}
    local count=0
    
    while [[ $count -lt $timeout ]]; do
        if (set -C; echo $$ > "$LOCK_FILE") 2>/dev/null; then
            trap 'rm -f "$LOCK_FILE"; exit $?' INT TERM EXIT
            return 0
        fi
        
        if [[ -f "$LOCK_FILE" ]]; then
            local lock_pid
            lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
            if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
                log_warn "Removing stale lock file (PID $lock_pid)"
                rm -f "$LOCK_FILE"
                continue
            fi
        fi
        
        log_debug "Waiting for lock... ($count/$timeout)"
        sleep 1
        ((count++))
    done
    
    log_error "Could not acquire lock after ${timeout}s"
    return 1
}

release_lock() {
    rm -f "$LOCK_FILE"
    trap - INT TERM EXIT
}

# Port management functions
is_port_available() {
    local port=$1
    ! ss -tlnp 2>/dev/null | grep -q ":${port}[[:space:]]"
}

find_available_port() {
    local start_port=${1:-9292}
    
    # First try the requested port
    if is_port_available "$start_port"; then
        echo "$start_port"
        return 0
    fi
    
    # Try default ports
    for port in "${DEFAULT_PORTS[@]}"; do
        if is_port_available "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    # Try random ports in safe range
    for i in {1..20}; do
        local port=$((30000 + RANDOM % 20000))
        if is_port_available "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    log_error "Could not find available port"
    return 1
}

get_port_from_pid() {
    local pid=$1
    ss -tlnp 2>/dev/null | grep "pid=$pid" | grep -oE ':[0-9]+' | tr -d ':' | head -1
}

get_processes_on_port() {
    local port=$1
    # Find all processes listening on the specified port
    ss -tlnp 2>/dev/null | grep ":${port}[[:space:]]" | grep -oE 'pid=[0-9]+' | cut -d= -f2
}

find_shopify_processes() {
    local port=${1:-""}
    # Find all shopify theme processes, optionally filtered by port
    if [[ -n "$port" ]]; then
        ps aux | grep -E "shopify theme.*--port $port|shopify theme dev.*$port" | grep -v grep | awk '{print $2}' 2>/dev/null || true
    else
        ps aux | grep -E "shopify theme dev|npm run theme:dev" | grep -v grep | awk '{print $2}' 2>/dev/null || true
    fi
}

wait_for_port_release() {
    local port=$1
    local timeout=${2:-10}
    local count=0
    
    log_debug "Waiting for port $port to be released (timeout: ${timeout}s)"
    
    while [[ $count -lt $timeout ]]; do
        if is_port_available "$port"; then
            log_debug "Port $port released after ${count}s"
            return 0
        fi
        log_debug "Port $port still in use, waiting... ($count/$timeout)"
        sleep 1
        ((count++))
    done
    
    log_debug "Port $port not released after ${timeout}s"
    return 1
}

# Process management functions
get_theme_processes() {
    ps aux | grep -E "shopify theme dev|npm run theme:dev" | grep -v grep | awk '{print $2,$11,$12,$13,$14,$15}' || true
}

is_process_running() {
    local pid=$1
    kill -0 "$pid" 2>/dev/null
}

get_pid_files() {
    find "$PID_DIR" -name "theme-dev-*.pid" 2>/dev/null | sort
}

cleanup_stale_pids() {
    log_debug "Cleaning up stale PID files..."
    
    for pid_file in $(get_pid_files); do
        if [[ -f "$pid_file" ]]; then
            local pid
            pid=$(cat "$pid_file" 2>/dev/null || echo "")
            
            if [[ -n "$pid" ]] && ! is_process_running "$pid"; then
                log_debug "Removing stale PID file: $(basename "$pid_file")"
                rm -f "$pid_file"
                
                # Also remove associated log file
                local port
                port=$(basename "$pid_file" .pid | sed 's/theme-dev-//')
                local log_file="$LOG_DIR/theme-dev-${port}.log"
                if [[ -f "$log_file" ]]; then
                    log_debug "Removing stale log file: $log_file"
                    rm -f "$log_file"
                fi
            fi
        fi
    done
}

# URL management functions
update_working_url() {
    local url=$1
    echo "$url" > "$WORKING_URL_FILE"
    log_info "Updated working URL: $url"
}

get_working_url() {
    if [[ -f "$WORKING_URL_FILE" ]]; then
        cat "$WORKING_URL_FILE" 2>/dev/null | head -1
    else
        echo "http://127.0.0.1:9292"
    fi
}

health_check() {
    local url=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    
    if command -v curl >/dev/null 2>&1; then
        curl -s --max-time "$timeout" --head "$url" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q --timeout="$timeout" --spider "$url" >/dev/null 2>&1
    else
        log_warn "Neither curl nor wget available for health check"
        return 0  # Assume healthy if we can't check
    fi
}

# Main functions
start_theme_dev() {
    local requested_port=${1:-""}
    local port
    
    if [[ -n "$requested_port" ]]; then
        if ! is_port_available "$requested_port"; then
            log_error "Port $requested_port is already in use"
            return 1
        fi
        port=$requested_port
    else
        port=$(find_available_port)
        if [[ -z "$port" ]]; then
            return 1
        fi
    fi
    
    log_info "Starting theme development server on port $port..."
    
    # Clean and build assets
    log_info "🧹 Cleaning assets folder..."
    cd "$PROJECT_ROOT"
    npm run clean >/dev/null 2>&1 || log_warn "Clean command failed"
    
    log_info "🔨 Building for development..."
    npm run build:dev >/dev/null 2>&1 || log_warn "Build command failed"
    
    # Create log file
    local log_file="$LOG_DIR/theme-dev-${port}.log"
    local pid_file="$PID_DIR/theme-dev-${port}.pid"
    
    # Start the theme dev server
    log_info "🚀 Starting Shopify theme dev server..."
    
    # Use npx to run local Shopify CLI from theme directory
    local shopify_cmd="cd $THEME_DIR && npx shopify theme dev --store $SHOPIFY_STORE"
    if [[ "$port" != "9292" ]]; then
        shopify_cmd="$shopify_cmd --port $port"
    fi
    
    # Start in background and capture PID using process group
    setsid nohup bash -c "$shopify_cmd" > "$log_file" 2>&1 &
    local pid=$!
    
    # Store PID
    echo "$pid" > "$pid_file"
    
    # Wait for startup and verify
    log_info "⏳ Waiting for server startup..."
    local count=0
    local url="http://127.0.0.1:${port}"
    
    while [[ $count -lt $MAX_STARTUP_WAIT ]]; do
        if is_process_running "$pid" && health_check "$url" 2>/dev/null; then
            update_working_url "$url"
            log_info "✅ Theme dev server started successfully!"
            log_info "🌐 URL: $url"
            log_info "📋 Logs: tail -f $log_file"
            log_info "🆔 PID: $pid"
            log_info "🛑 Stop: $0 stop $port"
            return 0
        fi
        
        if ! is_process_running "$pid"; then
            log_error "Process died during startup. Check logs: $log_file"
            rm -f "$pid_file"
            return 1
        fi
        
        sleep 2
        ((count += 2))
    done
    
    log_error "Server failed to start within ${MAX_STARTUP_WAIT}s. Check logs: $log_file"
    if is_process_running "$pid"; then
        kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    return 1
}

stop_theme_dev() {
    # Temporarily disable errexit for this function to prevent script termination
    set +e
    
    local target=${1:-"all"}
    local stopped_count=0
    
    cleanup_stale_pids
    
    if [[ "$target" == "all" || -z "$target" ]]; then
        # When no target is specified, stop all running servers
        local running_servers=()
        
        # Find all running servers
        for pid_file in $(get_pid_files); do
            if [[ -f "$pid_file" ]]; then
                local port
                port=$(basename "$pid_file" .pid | sed 's/theme-dev-//')
                local pid
                pid=$(cat "$pid_file" 2>/dev/null || echo "")
                
                if [[ -n "$pid" ]] && is_process_running "$pid"; then
                    running_servers+=("$port")
                fi
            fi
        done
        
        if [[ ${#running_servers[@]} -gt 0 ]]; then
            log_info "Stopping all ${#running_servers[@]} theme development server(s)..."
            
            # Stop all servers
            for port in "${running_servers[@]}"; do
                local pid_file="$PID_DIR/theme-dev-${port}.pid"
                local pid
                pid=$(cat "$pid_file" 2>/dev/null || echo "")
                
                if [[ -n "$pid" ]] && is_process_running "$pid"; then
                    log_info "Stopping server on port $port (PID: $pid)..."
                    
                    # Kill the process (in subshell to avoid script termination)
                    ( kill -TERM "$pid" 2>/dev/null || true ) >/dev/null 2>&1
                    ( timeout 2 kill -TERM -"$pid" 2>/dev/null || true ) >/dev/null 2>&1
                    
                    # Wait for graceful shutdown
                    local wait_count=0
                    while [[ $wait_count -lt 5 ]] && is_process_running "$pid"; do
                        sleep 1
                        ((wait_count++))
                    done
                    
                    # Force kill if still running
                    if is_process_running "$pid"; then
                        log_warn "Process still running after 5s, force killing..."
                        ( kill -KILL "$pid" 2>/dev/null || true ) >/dev/null 2>&1
                        ( timeout 2 kill -KILL -"$pid" 2>/dev/null || true ) >/dev/null 2>&1
                        sleep 1
                    fi
                    
                    # Clean up port
                    timeout 3 bash -c "
                        for spid in \$(ps aux | grep -E 'shopify theme.*$port|shopify theme dev.*$port' | grep -v grep | awk '{print \$2}' 2>/dev/null || true); do
                            if [[ -n \"\$spid\" ]] && kill -0 \"\$spid\" 2>/dev/null; then
                                kill -KILL \"\$spid\" 2>/dev/null || true
                            fi
                        done
                    " 2>/dev/null || true
                    
                    # Wait for port release
                    if wait_for_port_release "$port" 5; then
                        ((stopped_count++))
                        log_info "✅ Stopped server on port $port"
                    else
                        log_warn "Port $port may still be in use after cleanup"
                        ((stopped_count++))
                    fi
                    
                    rm -f "$pid_file"
                    
                    # Clean up log file
                    local log_file="$LOG_DIR/theme-dev-${port}.log"
                    if [[ -f "$log_file" ]]; then
                        log_debug "Removing log file: $log_file"
                        rm -f "$log_file"
                    fi
                fi
            done
            
            log_info "✅ Stopped all $stopped_count server(s)"
            echo "http://127.0.0.1:9292" > "$WORKING_URL_FILE"
            return 0
        else
            log_info "No theme development servers are currently running."
            return 0
        fi
    fi
    
    if [[ "$target" =~ ^[0-9]+$ ]]; then
        # Target is either a port or PID
        local pid_file="$PID_DIR/theme-dev-${target}.pid"
        
        if [[ -f "$pid_file" ]]; then
            # Target is a port
            local pid
            pid=$(cat "$pid_file" 2>/dev/null || echo "")
            
            if [[ -n "$pid" ]] && is_process_running "$pid"; then
                log_info "Stopping server on port $target (PID: $pid)..."
                
                # Kill the process and any child processes
                log_debug "Attempting to kill process $pid"
                
                # Kill individual process first (more reliable) - in subshell to avoid script termination
                ( kill -TERM "$pid" 2>/dev/null || true ) >/dev/null 2>&1
                
                # Also try to kill process group if it exists (best effort, with timeout)
                ( timeout 2 kill -TERM -"$pid" 2>/dev/null || true ) >/dev/null 2>&1
                
                # Wait for graceful shutdown
                local wait_count=0
                while [[ $wait_count -lt 5 ]] && is_process_running "$pid"; do
                    sleep 1
                    ((wait_count++))
                done
                
                # Force kill if still running
                if is_process_running "$pid"; then
                    log_warn "Process still running after 5s, force killing..."
                    log_debug "Attempting force kill on process $pid"
                    
                    # Kill individual process first (more reliable)
                    kill -KILL "$pid" 2>/dev/null || true
                    
                    # Also try to kill process group if it exists (best effort, with timeout)
                    timeout 2 kill -KILL -"$pid" 2>/dev/null || true
                    
                    sleep 1
                fi
                
                # Quick cleanup of any remaining processes (with timeout)
                log_debug "Cleaning up any remaining processes on port $target"
                
                # Kill any remaining shopify processes on this port (with timeout)
                timeout 3 bash -c "
                    for spid in \$(ps aux | grep -E 'shopify theme.*$target|shopify theme dev.*$target' | grep -v grep | awk '{print \$2}' 2>/dev/null || true); do
                        if [[ -n \"\$spid\" ]] && kill -0 \"\$spid\" 2>/dev/null; then
                            kill -KILL \"\$spid\" 2>/dev/null || true
                        fi
                    done
                " 2>/dev/null || true
                
                # Kill any process still using the port (with timeout)
                timeout 3 bash -c "
                    for ppid in \$(ss -tlnp 2>/dev/null | grep ':$target[[:space:]]' | grep -oE 'pid=[0-9]+' | cut -d= -f2); do
                        if [[ -n \"\$ppid\" ]] && kill -0 \"\$ppid\" 2>/dev/null; then
                            kill -KILL \"\$ppid\" 2>/dev/null || true
                        fi
                    done
                " 2>/dev/null || true
                
                # Wait for port to be released
                if wait_for_port_release "$target" 5; then
                    stopped_count=1
                    log_info "✅ Stopped server on port $target"
                else
                    log_warn "Port $target may still be in use after cleanup"
                    stopped_count=1  # Consider it stopped anyway
                fi
            fi
            
            rm -f "$pid_file"
            
            # Clean up log file
            local log_file="$LOG_DIR/theme-dev-${target}.log"
            if [[ -f "$log_file" ]]; then
                log_debug "Removing log file: $log_file"
                rm -f "$log_file"
            fi
        else
            # Target might be a PID
            if is_process_running "$target"; then
                local port
                port=$(get_port_from_pid "$target")
                log_info "Stopping process $target (port: ${port:-unknown})..."
                
                # Kill the process and any child processes
                log_debug "Attempting to kill process $target"
                
                # Kill individual process first (more reliable)
                kill -TERM "$target" 2>/dev/null || true
                
                # Also try to kill process group if it exists (best effort, with timeout)
                timeout 2 kill -TERM -"$target" 2>/dev/null || true
                
                # Wait for graceful shutdown
                local wait_count=0
                while [[ $wait_count -lt 5 ]] && is_process_running "$target"; do
                    sleep 1
                    ((wait_count++))
                done
                
                # Force kill if still running
                if is_process_running "$target"; then
                    log_warn "Process still running after 5s, force killing..."
                    log_debug "Attempting force kill on process $target"
                    
                    # Kill individual process first (more reliable)
                    kill -KILL "$target" 2>/dev/null || true
                    
                    # Also try to kill process group if it exists (best effort, with timeout)
                    timeout 2 kill -KILL -"$target" 2>/dev/null || true
                    
                    sleep 1
                fi
                
                # If we have a port, clean up any remaining processes
                if [[ -n "$port" ]]; then
                    # Quick cleanup of any remaining processes (with timeout)
                    log_debug "Cleaning up any remaining processes on port $port"
                    
                    # Kill any remaining shopify processes on this port (with timeout)
                    timeout 3 bash -c "
                        for spid in \$(ps aux | grep -E 'shopify theme.*$port|shopify theme dev.*$port' | grep -v grep | awk '{print \$2}' 2>/dev/null || true); do
                            if [[ -n \"\$spid\" ]] && kill -0 \"\$spid\" 2>/dev/null; then
                                kill -KILL \"\$spid\" 2>/dev/null || true
                            fi
                        done
                    " 2>/dev/null || true
                    
                    # Kill any process still using the port (with timeout)
                    timeout 3 bash -c "
                        for ppid in \$(ss -tlnp 2>/dev/null | grep ':$port[[:space:]]' | grep -oE 'pid=[0-9]+' | cut -d= -f2); do
                            if [[ -n \"\$ppid\" ]] && kill -0 \"\$ppid\" 2>/dev/null; then
                                kill -KILL \"\$ppid\" 2>/dev/null || true
                            fi
                        done
                    " 2>/dev/null || true
                    
                    # Wait for port to be released
                    if wait_for_port_release "$port" 5; then
                        stopped_count=1
                        log_info "✅ Stopped process $target"
                        rm -f "$PID_DIR/theme-dev-${port}.pid"
                        
                        # Clean up log file
                        local log_file="$LOG_DIR/theme-dev-${port}.log"
                        if [[ -f "$log_file" ]]; then
                            log_debug "Removing log file: $log_file"
                            rm -f "$log_file"
                        fi
                    else
                        log_warn "Port $port may still be in use after cleanup"
                        stopped_count=1  # Consider it stopped anyway
                        rm -f "$PID_DIR/theme-dev-${port}.pid"
                        
                        # Clean up log file
                        local log_file="$LOG_DIR/theme-dev-${port}.log"
                        if [[ -f "$log_file" ]]; then
                            log_debug "Removing log file: $log_file"
                            rm -f "$log_file"
                        fi
                    fi
                else
                    # No port info, just check if process stopped
                    if ! is_process_running "$target"; then
                        stopped_count=1
                        log_info "✅ Stopped process $target"
                    else
                        log_error "Failed to stop process $target"
                    fi
                fi
            else
                log_warn "No running server found for target: $target"
                return 0  # Return success since there's nothing to stop
            fi
        fi
    else
        log_error "Invalid target: $target (use 'all', port number, or PID)"
        return 1
    fi
    
    if [[ $stopped_count -gt 0 ]]; then
        log_info "Stopped $stopped_count server(s)"
        
        # Update working URL if no servers are running
        if [[ -z "$(get_pid_files)" ]]; then
            echo "http://127.0.0.1:9292" > "$WORKING_URL_FILE"
        fi
    else
        log_warn "No servers were stopped"
    fi
    
    # Re-enable errexit
    set -e
}

list_theme_devs() {
    cleanup_stale_pids
    
    local pid_files
    pid_files=($(get_pid_files))
    
    if [[ ${#pid_files[@]} -eq 0 ]]; then
        log_info "No theme development servers are currently running."
        return 0
    fi
    
    echo -e "\n${WHITE}Running Theme Development Servers:${NC}"
    echo -e "${WHITE}=====================================${NC}"
    printf "%-6s %-6s %-20s %-8s %-10s\n" "PID" "PORT" "URL" "STATUS" "UPTIME"
    echo "-----------------------------------------------------------"
    
    for pid_file in "${pid_files[@]}"; do
        if [[ -f "$pid_file" ]]; then
            local pid
            pid=$(cat "$pid_file" 2>/dev/null || echo "")
            local port
            port=$(basename "$pid_file" .pid | sed 's/theme-dev-//')
            local url="http://127.0.0.1:${port}"
            
            if [[ -n "$pid" ]] && is_process_running "$pid"; then
                # Get process uptime
                local uptime
                uptime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ' || echo "unknown")
                
                # Check health
                local status
                if health_check "$url" 2>/dev/null; then
                    status="${GREEN}healthy${NC}"
                else
                    status="${YELLOW}unhealthy${NC}"
                fi
                
                printf "%-6s %-6s %-20s %-8s %-10s\n" "$pid" "$port" "$url" "$status" "$uptime"
            else
                printf "%-6s %-6s %-20s %-8s %-10s\n" "N/A" "$port" "$url" "${RED}dead${NC}" "N/A"
            fi
        fi
    done
    
    echo ""
}

show_status() {
    cleanup_stale_pids
    
    echo -e "\n${WHITE}Theme Development Manager Status${NC}"
    echo -e "${WHITE}=================================${NC}"
    
    # Working URL
    local working_url
    working_url=$(get_working_url)
    echo -e "Working URL: ${CYAN}$working_url${NC}"
    
    # Configuration
    echo -e "Store: ${CYAN}$SHOPIFY_STORE${NC}"
    echo -e "PID Directory: ${CYAN}$PID_DIR${NC}"
    echo -e "Log Directory: ${CYAN}$LOG_DIR${NC}"
    
    # System info
    local available_ports=()
    for port in "${DEFAULT_PORTS[@]}"; do
        if is_port_available "$port"; then
            available_ports+=("$port")
        fi
    done
    
    echo -e "Available Ports: ${CYAN}${available_ports[*]}${NC}"
    
    # List running servers
    list_theme_devs
    
    # Log files info
    local log_count
    log_count=$(find "$LOG_DIR" -name "theme-dev-*.log" 2>/dev/null | wc -l)
    echo -e "Log Files: ${CYAN}$log_count${NC} in $LOG_DIR"
}

show_logs() {
    local target=${1:-""}
    
    if [[ -z "$target" ]]; then
        # Show available log files
        echo -e "\n${WHITE}Available Log Files:${NC}"
        echo -e "${WHITE}===================${NC}"
        
        for log_file in "$LOG_DIR"/theme-dev-*.log; do
            if [[ -f "$log_file" ]]; then
                local port
                port=$(basename "$log_file" .log | sed 's/theme-dev-//')
                local size
                size=$(du -h "$log_file" | cut -f1)
                local modified
                modified=$(stat -c '%y' "$log_file" | cut -d' ' -f1-2)
                
                printf "%-6s %-8s %-20s %s\n" "$port" "$size" "$modified" "$log_file"
            fi
        done
        
        echo -e "\nUsage: $0 logs <port|pid>"
        return 0
    fi
    
    local log_file=""
    
    if [[ "$target" =~ ^[0-9]+$ ]]; then
        # Check if it's a port
        local port_log="$LOG_DIR/theme-dev-${target}.log"
        if [[ -f "$port_log" ]]; then
            log_file="$port_log"
        else
            # Check if it's a PID
            local port
            port=$(get_port_from_pid "$target" 2>/dev/null || echo "")
            if [[ -n "$port" ]]; then
                log_file="$LOG_DIR/theme-dev-${port}.log"
            fi
        fi
    fi
    
    if [[ -n "$log_file" ]] && [[ -f "$log_file" ]]; then
        log_info "Showing logs for $target: $log_file"
        echo -e "${WHITE}=================================${NC}"
        tail -f "$log_file"
    else
        log_error "No log file found for target: $target"
        return 1
    fi
}

restart_theme_dev() {
    local port=${1:-""}
    
    if [[ -n "$port" ]]; then
        log_info "Restarting theme dev server on port $port..."
        
        # Stop the server first (allow it to fail if server is not running)
        stop_theme_dev "$port" || true
        
        log_info "Waiting 3 seconds before restart..."
        sleep 3
        
        # Start the server
        start_theme_dev "$port"
        return $?
    else
        # Restart the working URL server or start a new one
        local working_url
        working_url=$(get_working_url)
        local current_port
        current_port=$(echo "$working_url" | grep -oE '[0-9]+$' || echo "9292")
        
        log_info "Restarting theme dev server on port $current_port..."
        
        # Stop the server first (allow it to fail if server is not running)
        stop_theme_dev "$current_port" || true
        
        log_info "Waiting 3 seconds before restart..."
        sleep 3
        
        # Start the server
        start_theme_dev "$current_port"
        return $?
    fi
}

show_help() {
    cat << 'EOF'

Shopify Theme Development Manager v2.1.0

USAGE:
    manager-theme-dev.sh <command> [options]

COMMANDS:
    start [PORT]        Start a new theme dev server (auto-assigns port if not specified)
    stop <PORT|PID>     Stop specific theme dev server by port or PID
    stop                Stop all running servers
    restart [PORT]      Restart theme dev server (uses working URL port if not specified)
    list                List all running theme dev servers
    status              Show detailed status and system information
    logs [PORT|PID]     Show logs for specific server (lists all if not specified)
    url [URL]           Get or set the working URL
    cleanup             Clean up stale PID files and old logs
    help                Show this help message

EXAMPLES:
    ./manager-theme-dev.sh start         # Start server on auto-assigned port
    ./manager-theme-dev.sh start 43091   # Start server on specific port
    ./manager-theme-dev.sh stop          # Stop all running servers
    ./manager-theme-dev.sh stop 43091    # Stop server on specific port
    ./manager-theme-dev.sh list          # List all running servers
    ./manager-theme-dev.sh status        # Show comprehensive status
    ./manager-theme-dev.sh logs 43091    # Show logs for port 43091
    ./manager-theme-dev.sh restart       # Restart server on working URL port

ENVIRONMENT:
    DEBUG=1             Enable debug logging

FILES:
    ~/.theme-dev-pids/  PID files for running servers
    ./logs/             Log files for each server instance
    ./working-url.md    Current working URL
    ./.theme-dev-config Configuration file

EOF
}

cleanup_system() {
    log_info "Cleaning up system..."
    
    # Clean up stale PID files
    cleanup_stale_pids
    
    # Clean up old log files (older than 7 days)
    find "$LOG_DIR" -name "theme-dev-*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Verify no zombie processes
    pkill -f "shopify theme dev" 2>/dev/null || true
    
    log_info "✅ System cleanup completed"
}

# Main command dispatcher
main() {
    local command=${1:-"help"}
    shift || true
    
    # Initialize
    init_directories
    
    # Acquire lock for most operations
    case "$command" in
        list|status|logs|help|url)
            # These commands don't need locks
            ;;
        *)
            if ! acquire_lock 10; then
                log_error "Another instance is running. Please wait or check for stale processes."
                exit 1
            fi
            ;;
    esac
    
    # Dispatch commands
    case "$command" in
        start)
            start_theme_dev "$@"
            ;;
        stop)
            stop_theme_dev "$@"
            ;;
        restart)
            restart_theme_dev "$@"
            ;;
        list|ls)
            list_theme_devs "$@"
            ;;
        status)
            show_status "$@"
            ;;
        logs)
            show_logs "$@"
            ;;
        url)
            if [[ $# -gt 0 ]]; then
                update_working_url "$1"
            else
                get_working_url
            fi
            ;;
        cleanup)
            cleanup_system "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Use '$0 help' for usage information."
            exit 1
            ;;
    esac
    
    # Release lock
    case "$command" in
        list|status|logs|help|url)
            # These commands don't use locks
            ;;
        *)
            release_lock
            ;;
    esac
}

# Run main function
main "$@"