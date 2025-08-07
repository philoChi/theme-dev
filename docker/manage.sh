#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors - with terminal detection
if [ -t 1 ] && [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
    # Terminal supports colors
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    # No color support
    GREEN=''
    YELLOW=''
    RED=''
    BLUE=''
    NC=''
fi

CONTAINER_NAME="ai-agent-workspace-mcp"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Function to check if we're running with sudo
running_with_sudo() {
    [ "$EUID" -eq 0 ] || [ -n "$SUDO_USER" ]
}

# Auto-elevate to sudo if needed (unless --no-sudo flag is passed)
if [[ ! "$@" =~ "--no-sudo" ]]; then
    # Check if Docker needs sudo
    if ! docker ps >/dev/null 2>&1; then
        if sudo -n docker ps >/dev/null 2>&1; then
            # We need sudo and it's available without password
            if ! running_with_sudo; then
                echo -e "${YELLOW}Docker requires sudo. Re-running with elevated privileges...${NC}"
                exec sudo "$0" "$@"
            fi
        elif sudo docker ps >/dev/null 2>&1; then
            # We need sudo but it requires password
            if ! running_with_sudo; then
                echo -e "${YELLOW}Docker requires sudo privileges.${NC}"
                echo -e "${BLUE}You can avoid this by adding your user to the docker group:${NC}"
                echo -e "  ${GREEN}sudo usermod -aG docker $USER${NC}"
                echo -e "  ${GREEN}(then logout and login again)${NC}"
                echo ""
                echo -e "${YELLOW}Re-running with sudo (you may be prompted for password)...${NC}"
                exec sudo "$0" "$@"
            fi
        else
            echo -e "${RED}Error: Docker daemon not accessible even with sudo${NC}"
            exit 1
        fi
    fi
fi

# Change to the docker directory for all operations
cd "$SCRIPT_DIR"

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: docker-compose.yml not found in $SCRIPT_DIR${NC}"
    exit 1
fi

print_help() {
    echo "Usage: ./manage.sh [command] [options]"
    echo ""
    echo "Options:"
    echo "  --no-sudo   - Don't auto-elevate to sudo (if your user is in docker group)"
    echo ""
    echo "Commands:"
    printf "  ${GREEN}Starting & Connecting:${NC}\n"
    echo "    (none)      - Start container (if needed) and open shell"
    echo "    shell       - Open another shell in already running container"
    echo "    attach      - Start container in foreground mode (see all output live)"
    echo ""
    printf "  ${GREEN}Building & Setup:${NC}\n"
    echo "    init        - First time setup: build image and start fresh"
    echo "    build       - Build/rebuild the container image only"
    echo "    rebuild     - Rebuild image AND restart container (full refresh)"
    echo ""
    printf "  ${GREEN}Container Management:${NC}\n"
    echo "    stop        - Stop the running container"
    echo "    restart     - Restart container (keeps data)"
    echo "    status      - Show container and image status"
    echo ""
    printf "  ${GREEN}Logs & Monitoring:${NC}\n"
    echo "    logs        - Show recent logs and follow new output"
    echo "    logs-full   - Show ALL logs from container start"
    echo ""
    printf "  ${GREEN}Cleanup & Maintenance:${NC}\n"
    echo "    usage       - Show Docker disk usage for this project"
    echo "    clean       - Remove containers, volumes, and Docker resources"
    echo "    deep-clean  - Aggressive cleanup including images (frees max space)"
    echo ""
    printf "  ${GREEN}Shortcuts & Utilities:${NC}\n"
    echo "    install-shortcut   - Install 'dock' command for quick access"
    echo "    uninstall-shortcut - Remove 'dock' command"
    echo ""
    printf "${YELLOW}First time?${NC} Run: ${GREEN}./manage.sh init${NC}\n"
    printf "${YELLOW}Need help?${NC} Run: ${GREEN}./manage.sh help${NC}\n"
    echo ""
}

# Function to wait for container initialization and show progress
wait_for_initialization() {
    local timeout=60
    local start_time=$(date +%s)
    
    echo -e "${BLUE}⏳ Container is initializing...${NC}"
    echo -e "${YELLOW}Following startup progress:${NC}"
    echo ""
    
    # Follow logs until initialization is complete or timeout
    (
        docker logs -f $CONTAINER_NAME 2>&1 | while IFS= read -r line; do
            # Display the log line
            echo "$line"
            
            # Check for completion markers
            if echo "$line" | grep -q "AI Agent Workspace.*is ready!" || 
               echo "$line" | grep -q "Quick Start Guide:"; then
                echo ""
                echo -e "${GREEN}✅ Container initialization complete!${NC}"
                # Kill the parent docker logs process
                pkill -P $$ docker
                return 0
            fi
            
            # Check for timeout
            current_time=$(date +%s)
            elapsed=$((current_time - start_time))
            if [ $elapsed -gt $timeout ]; then
                echo ""
                echo -e "${RED}⚠️  Initialization timeout after ${timeout}s${NC}"
                pkill -P $$ docker
                return 1
            fi
        done
    ) &
    
    # Wait for the background process
    wait $!
    return $?
}

# Function to install the 'dock' shortcut
install_shortcut() {
    local shortcut_name="dock"
    local manage_script="$SCRIPT_DIR/manage.sh"
    
    printf "${BLUE}=== Installing Docker Manager Shortcut ===${NC}\n"
    echo ""
    
    # Determine install location
    if [ -d "$HOME/.local/bin" ]; then
        INSTALL_DIR="$HOME/.local/bin"
    elif [ -d "$HOME/bin" ]; then
        INSTALL_DIR="$HOME/bin"
    else
        # Create ~/.local/bin if it doesn't exist
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
        printf "${YELLOW}Created $INSTALL_DIR${NC}\n"
    fi
    
    local shortcut_path="$INSTALL_DIR/$shortcut_name"
    
    # Create the wrapper script that preserves TTY
    cat > "$shortcut_path" << 'EOF'
#!/bin/bash
# Docker Manager Wrapper - Auto-generated
MANAGE_SCRIPT="PLACEHOLDER_MANAGE_SCRIPT"
# Check if we have a TTY and pass it through
if [ -t 1 ]; then
    # We have a TTY, execute normally
    exec "$MANAGE_SCRIPT" "$@"
else
    # No TTY, but still try to force color if possible
    export CLICOLOR_FORCE=1
    exec "$MANAGE_SCRIPT" "$@"
fi
EOF
    
    # Replace placeholder with actual path
    sed -i "s|PLACEHOLDER_MANAGE_SCRIPT|$manage_script|g" "$shortcut_path"
    chmod +x "$shortcut_path"
    
    printf "${GREEN}✅ Shortcut installed successfully!${NC}\n"
    echo ""
    printf "${YELLOW}You can now use:${NC}\n"
    printf "  ${GREEN}$shortcut_name${NC} instead of ${BLUE}./manage.sh${NC}\n"
    printf "  ${GREEN}$shortcut_name init${NC} instead of ${BLUE}./manage.sh init${NC}\n"
    printf "  ${GREEN}$shortcut_name shell${NC} instead of ${BLUE}./manage.sh shell${NC}\n"
    echo ""
    
    # Check if install directory is in PATH
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        printf "${YELLOW}⚠️  $INSTALL_DIR is not in your PATH${NC}\n"
        echo ""
        echo "Add this line to your ~/.bashrc or ~/.zshrc:"
        printf "${GREEN}export PATH=\"\$PATH:$INSTALL_DIR\"${NC}\n"
        echo ""
        echo "Then reload your shell:"
        printf "${GREEN}source ~/.bashrc${NC} or ${GREEN}source ~/.zshrc${NC}\n"
    else
        printf "${GREEN}✅ $INSTALL_DIR is already in your PATH${NC}\n"
        printf "${BLUE}The '$shortcut_name' command is ready to use!${NC}\n"
    fi
    echo ""
}

# Function to uninstall the 'dock' shortcut
uninstall_shortcut() {
    local shortcut_name="dock"
    
    printf "${BLUE}=== Uninstalling Docker Manager Shortcut ===${NC}\n"
    echo ""
    
    # Check common locations
    local locations=("$HOME/.local/bin" "$HOME/bin" "/usr/local/bin")
    local found=false
    
    for location in "${locations[@]}"; do
        local shortcut_path="$location/$shortcut_name"
        if [ -f "$shortcut_path" ]; then
            # Verify it's our shortcut by checking the content
            if grep -q "Docker Manager Wrapper" "$shortcut_path" 2>/dev/null; then
                printf "${YELLOW}Found shortcut at: $shortcut_path${NC}\n"
                if rm "$shortcut_path"; then
                    printf "${GREEN}✅ Shortcut removed successfully!${NC}\n"
                    found=true
                else
                    printf "${RED}❌ Failed to remove shortcut (permission denied?)${NC}\n"
                    return 1
                fi
            fi
        fi
    done
    
    if [ "$found" = false ]; then
        printf "${YELLOW}No '$shortcut_name' shortcut found in common locations:${NC}\n"
        for location in "${locations[@]}"; do
            echo "  - $location"
        done
        echo ""
        printf "${BLUE}If you installed it elsewhere, please remove it manually.${NC}\n"
    fi
    echo ""
}

# Main start function - always gives you a working shell with proper login
start_container() {
    local show_progress=true
    
    # Check if image exists
    if ! docker images | grep -q "ai-agent-workspace-mcp"; then
        echo -e "${RED}Image not found! Building first...${NC}"
        docker-compose build
    fi
    
    # Check if container is already running
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo -e "${YELLOW}Container is running, connecting...${NC}"
        show_progress=false
    else
        # Check if container exists but stopped
        if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
            echo -e "${YELLOW}Starting stopped container...${NC}"
            docker-compose up -d
            
            # Check if container has already been initialized
            if docker exec $CONTAINER_NAME test -f /tmp/.container_initialized 2>/dev/null; then
                echo -e "${GREEN}✅ Container already initialized, connecting...${NC}"
                show_progress=false
                sleep 1
            fi
        else
            echo -e "${GREEN}Creating new container...${NC}"
            docker-compose up -d
        fi
        
        # Show initialization progress if needed
        if [ "$show_progress" = true ]; then
            if ! wait_for_initialization; then
                echo -e "${YELLOW}⚠️  Container may not be fully initialized${NC}"
                echo -e "${YELLOW}You can check logs with: ./manage.sh logs${NC}"
            fi
        fi
    fi
    
    # Connect with a proper login shell that sources .bashrc automatically
    docker exec -it $CONTAINER_NAME /bin/bash -l
}

case "$1" in
    "")
        start_container
        ;;
        
    start)
        # For explicit 'start' command, always show entrypoint and then shell
        echo -e "${GREEN}Starting container and showing entrypoint...${NC}"
        
        # Check if image exists
        if ! docker images | grep -q "ai-agent-workspace-mcp"; then
            echo -e "${RED}Image not found! Building first...${NC}"
            docker-compose build
        fi
        
        # Check if container is already running
        if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
            echo -e "${YELLOW}Container is running, showing current entrypoint and connecting...${NC}"
            # Show recent logs to display entrypoint
            echo -e "${BLUE}Current entrypoint output:${NC}"
            docker logs --tail 20 $CONTAINER_NAME
            echo ""
        else
            # Check if container exists but stopped
            if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
                echo -e "${YELLOW}Starting stopped container...${NC}"
                docker-compose up -d
            else
                echo -e "${GREEN}Creating new container...${NC}"
                docker-compose up -d
            fi
            
            # Always show initialization progress for explicit start
            if ! wait_for_initialization; then
                echo -e "${YELLOW}⚠️  Container may not be fully initialized${NC}"
                echo -e "${YELLOW}You can check logs with: ./manage.sh logs${NC}"
            fi
        fi
        
        # Connect with a proper login shell that sources .bashrc automatically
        docker exec -it $CONTAINER_NAME /bin/bash -l
        ;;
        
    init)
        echo -e "${GREEN}=== First Time Setup ===${NC}"
        echo -e "${YELLOW}Cleaning any existing containers...${NC}"
        docker-compose down -v 2>/dev/null || true
        echo -e "${GREEN}Building fresh image...${NC}"
        docker-compose build
        echo -e "${GREEN}Starting container with initialization progress...${NC}"
        echo ""
        start_container
        ;;
        
    build)
        echo -e "${GREEN}Building container image...${NC}"
        docker-compose build
        echo -e "${GREEN}Build complete!${NC}"
        ;;
        
    rebuild)
        echo -e "${YELLOW}Rebuilding everything...${NC}"
        docker-compose down
        docker-compose build --no-cache
        echo -e "${GREEN}Starting fresh container with initialization progress...${NC}"
        echo ""
        start_container
        ;;
        
    attach)
        echo -e "${GREEN}Starting container in foreground mode...${NC}"
        echo -e "${YELLOW}You'll see all container output in real-time${NC}"
        echo -e "${YELLOW}(Press Ctrl+C to stop the container)${NC}"
        echo ""
        # Check if container exists and remove it to ensure fresh start
        if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
            docker-compose down
        fi
        # Start in foreground to see all output
        docker-compose up
        ;;
        
    shell)
        if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
            echo -e "${GREEN}Opening new shell...${NC}"
            # Use login shell to ensure .bashrc is sourced
            docker exec -it $CONTAINER_NAME /bin/bash -l
        else
            echo -e "${RED}Container is not running!${NC}"
            echo -e "${YELLOW}Starting container first...${NC}"
            start_container
        fi
        ;;
        
    restart)
        echo -e "${YELLOW}Restarting container...${NC}"
        docker-compose restart
        echo -e "${GREEN}Container restarted${NC}"
        echo -e "${YELLOW}Connecting to shell...${NC}"
        sleep 2
        docker exec -it $CONTAINER_NAME /bin/bash -l
        ;;
        
    stop)
        echo -e "${YELLOW}Stopping container...${NC}"
        docker-compose stop
        echo -e "${GREEN}Container stopped${NC}"
        ;;
        
    logs)
        if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
            docker logs --tail 100 -f $CONTAINER_NAME
        else
            echo -e "${RED}No container found${NC}"
        fi
        ;;
        
    logs-full)
        if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
            echo -e "${BLUE}Showing ALL logs from container start...${NC}"
            echo -e "${YELLOW}(Press Ctrl+C to exit)${NC}"
            echo ""
            # Show all logs from the beginning
            docker logs $CONTAINER_NAME --follow
        else
            echo -e "${RED}No container found${NC}"
        fi
        ;;
        
    status)
        echo -e "${BLUE}=== Container Status ===${NC}"
        if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
            echo -e "${GREEN}✓ Container is running${NC}"
            docker ps --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        elif [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
            echo -e "${YELLOW}⚠ Container exists but is stopped${NC}"
            docker ps -a --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}"
        else
            echo -e "${RED}✗ No container found${NC}"
        fi
        
        echo -e "\n${BLUE}=== Image Status ===${NC}"
        if docker images | grep -q "ai-agent-workspace-mcp"; then
            echo -e "${GREEN}✓ Image exists${NC}"
            docker images | grep ai-agent-workspace-mcp
        else
            echo -e "${RED}✗ Image not built${NC}"
            echo -e "${YELLOW}Run './manage.sh build' to build the image${NC}"
        fi
        ;;
        
    usage)
        echo -e "${BLUE}=== Docker Disk Usage Analysis ===${NC}"
        echo ""
        
        # Overall Docker usage
        echo -e "${YELLOW}Overall Docker disk usage:${NC}"
        docker system df
        echo ""
        
        # Project-specific usage
        echo -e "${YELLOW}Project-specific resources:${NC}"
        
        # Container usage
        echo -e "\n${BLUE}Containers:${NC}"
        docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" || echo "  No containers found"
        
        # Image usage
        echo -e "\n${BLUE}Images:${NC}"
        docker images | grep -E "(REPOSITORY|ai-agent-workspace-mcp)" || echo "  No project images found"
        
        # Volume usage
        echo -e "\n${BLUE}Volumes:${NC}"
        echo "Name                            Size (Estimated)"
        echo "-------------------------------- ---------------"
        for vol in npm-cache yarn-cache claude-flow-data claude-config claude-config-alt bash-history redis-data postgres-data; do
            if docker volume ls | grep -q "docker_$vol"; then
                # Try to estimate volume size (this is approximate)
                SIZE=$(docker run --rm -v docker_$vol:/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "?")
                printf "%-32s %s\n" "docker_$vol" "$SIZE"
            fi
        done
        
        # Build cache usage
        echo -e "\n${BLUE}Build cache:${NC}"
        docker builder du 2>/dev/null || echo "  Unable to determine build cache size"
        
        echo ""
        echo -e "${GREEN}Tips to free up space:${NC}"
        echo "  - Run './manage.sh clean' to remove containers and volumes"
        echo "  - Run './manage.sh deep-clean' for aggressive cleanup (removes images too)"
        echo "  - Use 'docker system prune -a' to clean all unused Docker resources"
        ;;
        
    clean)
        # Function to get Docker disk usage
        get_docker_usage() {
            docker system df 2>/dev/null || echo "0"
        }
        
        # Function to format bytes
        format_bytes() {
            local bytes=$1
            if [ $bytes -lt 1024 ]; then
                echo "${bytes}B"
            elif [ $bytes -lt 1048576 ]; then
                echo "$((bytes / 1024))KB"
            elif [ $bytes -lt 1073741824 ]; then
                echo "$((bytes / 1048576))MB"
            else
                echo "$((bytes / 1073741824))GB"
            fi
        }
        
        echo -e "${BLUE}=== Docker Cleanup Utility ===${NC}"
        echo ""
        
        # Show current Docker disk usage
        echo -e "${YELLOW}Current Docker disk usage:${NC}"
        docker system df
        echo ""
        
        # Check what will be cleaned
        echo -e "${YELLOW}What will be cleaned:${NC}"
        echo -e "  ${RED}✗${NC} All containers for this project"
        echo -e "  ${RED}✗${NC} All volumes (npm-cache, yarn-cache, claude-flow-data, etc.)"
        echo -e "  ${RED}✗${NC} Project network (ai-agent-network)"
        echo -e "  ${RED}✗${NC} Dangling images"
        echo ""
        
        # List specific volumes that will be removed
        echo -e "${YELLOW}Volumes to be removed:${NC}"
        docker volume ls --filter "name=ai-agent" --format "table {{.Name}}\t{{.Size}}" 2>/dev/null || \
        docker volume ls | grep -E "(npm-cache|yarn-cache|claude-flow|bash-history|redis-data|postgres-data)" || \
        echo "  No project volumes found"
        echo ""
        
        echo -e "${RED}⚠️  WARNING: This will permanently delete all container data!${NC}"
        echo -e "${YELLOW}This includes:${NC}"
        echo "  - All installed npm/yarn packages"
        echo "  - Claude Flow configuration and memory"
        echo "  - Bash history"
        echo "  - Redis and PostgreSQL data"
        echo ""
        
        read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Starting cleanup...${NC}"
            
            # Stop and remove containers
            echo -e "${BLUE}[1/5] Stopping and removing containers...${NC}"
            docker-compose down -v
            
            # Remove dangling images
            echo -e "${BLUE}[2/5] Removing dangling images...${NC}"
            docker image prune -f
            
            # Remove unused volumes not managed by compose
            echo -e "${BLUE}[3/5] Removing unused volumes...${NC}"
            docker volume prune -f
            
            # Remove unused networks
            echo -e "${BLUE}[4/5] Removing unused networks...${NC}"
            docker network prune -f
            
            # Optional: Remove build cache
            echo -e "${BLUE}[5/5] Cleaning build cache...${NC}"
            docker builder prune -f
            
            echo ""
            echo -e "${GREEN}✅ Cleanup complete!${NC}"
            echo ""
            
            # Show disk usage after cleanup
            echo -e "${YELLOW}Docker disk usage after cleanup:${NC}"
            docker system df
            echo ""
            
            echo -e "${GREEN}To rebuild from scratch, run: ./manage.sh init${NC}"
        else
            echo -e "${YELLOW}Cleanup cancelled${NC}"
        fi
        ;;
        
    deep-clean)
        echo -e "${BLUE}=== Deep Docker Cleanup Utility ===${NC}"
        echo ""
        
        # Show current Docker disk usage
        echo -e "${YELLOW}Current Docker disk usage:${NC}"
        docker system df
        echo ""
        
        # Calculate project image size
        PROJECT_IMAGE_SIZE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "ai-agent-workspace-mcp" | awk '{print $3}' || echo "0")
        
        echo -e "${YELLOW}What will be cleaned (AGGRESSIVE MODE):${NC}"
        echo -e "  ${RED}✗${NC} All containers for this project"
        echo -e "  ${RED}✗${NC} All volumes (npm-cache, yarn-cache, claude-flow-data, etc.)"
        echo -e "  ${RED}✗${NC} Project network (ai-agent-network)"
        echo -e "  ${RED}✗${NC} Project image: ai-agent-workspace-mcp ($PROJECT_IMAGE_SIZE)"
        echo -e "  ${RED}✗${NC} All dangling images and volumes"
        echo -e "  ${RED}✗${NC} All build cache"
        echo -e "  ${RED}✗${NC} Unused Docker resources"
        echo ""
        
        echo -e "${RED}⚠️  EXTREME WARNING: This is an AGGRESSIVE cleanup!${NC}"
        echo -e "${YELLOW}This will:${NC}"
        echo "  - Remove ALL project data permanently"
        echo "  - Delete the project Docker image (requires rebuild)"
        echo "  - Clean all Docker build caches"
        echo "  - May affect other Docker projects if they share resources"
        echo ""
        echo -e "${YELLOW}Estimated space to be freed: Several GB${NC}"
        echo ""
        
        read -p "Are you ABSOLUTELY sure? Type 'yes' to confirm: " -r
        echo
        if [[ $REPLY == "yes" ]]; then
            echo ""
            echo -e "${YELLOW}Starting deep cleanup...${NC}"
            
            # Record initial disk usage
            BEFORE_USAGE=$(df -h . | tail -1 | awk '{print $3}')
            
            # Stop and remove all project containers and volumes
            echo -e "${BLUE}[1/7] Removing all project containers and volumes...${NC}"
            docker-compose down -v
            
            # Remove the project image
            echo -e "${BLUE}[2/7] Removing project image...${NC}"
            docker rmi ai-agent-workspace-mcp:latest -f 2>/dev/null || true
            
            # Remove all dangling images
            echo -e "${BLUE}[3/7] Removing ALL dangling images...${NC}"
            docker image prune -a -f
            
            # Remove all unused volumes
            echo -e "${BLUE}[4/7] Removing ALL unused volumes...${NC}"
            docker volume prune -f
            
            # Remove all unused networks
            echo -e "${BLUE}[5/7] Removing ALL unused networks...${NC}"
            docker network prune -f
            
            # Remove all build cache
            echo -e "${BLUE}[6/7] Removing ALL build cache...${NC}"
            docker builder prune -a -f
            
            # Final system prune for anything missed
            echo -e "${BLUE}[7/7] Final system cleanup...${NC}"
            docker system prune -a -f --volumes
            
            # Record final disk usage
            AFTER_USAGE=$(df -h . | tail -1 | awk '{print $3}')
            
            echo ""
            echo -e "${GREEN}✅ Deep cleanup complete!${NC}"
            echo ""
            
            # Show final Docker disk usage
            echo -e "${YELLOW}Docker disk usage after deep cleanup:${NC}"
            docker system df
            echo ""
            
            echo -e "${YELLOW}Disk usage change:${NC}"
            echo "  Before: $BEFORE_USAGE"
            echo "  After:  $AFTER_USAGE"
            echo ""
            
            echo -e "${GREEN}The project has been completely removed.${NC}"
            echo -e "${GREEN}To start fresh, run: ./manage.sh init${NC}"
        else
            echo -e "${YELLOW}Deep cleanup cancelled - type 'yes' to confirm${NC}"
        fi
        ;;
        
    install-shortcut)
        install_shortcut
        ;;
        
    uninstall-shortcut)
        uninstall_shortcut
        ;;
        
    help|--help|-h)
        print_help
        ;;
        
    # Deprecated command handling
    up)
        echo -e "${YELLOW}⚠️  'up' command has been renamed to 'attach'${NC}"
        echo -e "${GREEN}Running: ./manage.sh attach${NC}"
        echo ""
        $0 attach
        ;;
        
    fresh)
        echo -e "${YELLOW}⚠️  'fresh' command has been removed${NC}"
        echo -e "${GREEN}Use './manage.sh restart' to restart the container${NC}"
        echo -e "${GREEN}Use './manage.sh clean' followed by './manage.sh' for a fresh start${NC}"
        ;;
        
    startup)
        echo -e "${YELLOW}⚠️  'startup' command has been renamed to 'logs-full'${NC}"
        echo -e "${GREEN}Running: ./manage.sh logs-full${NC}"
        echo ""
        $0 logs-full
        ;;
        
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_help
        ;;
esac
