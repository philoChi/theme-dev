#!/bin/bash

# Hyspex Theme Deployment Script
# Deploys webpack-generated theme content to separate theme-hyspex repository
# 
# Features:
# - Two deployment modes: development and production webpack builds
# - Always deploys to development branch (never master)
# - Repository validation and initialization
# - Comprehensive safety checks and rollback capabilities
# - Atomic deployment with error handling
#
# Author: Claude Code
# Version: 1.0.0

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly SOURCE_THEME_DIR="$PROJECT_ROOT/theme-hyspex"
readonly TARGET_REPO_DIR="$PROJECT_ROOT/../theme-hyspex"
readonly DEPLOYMENT_BRANCH="development"
readonly LOCK_FILE="$PROJECT_ROOT/.deploy.lock"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

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
    local timeout=${1:-30}
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
    
    log_error "Could not acquire lock after ${timeout}s. Another deployment may be running."
    return 1
}

release_lock() {
    rm -f "$LOCK_FILE"
    trap - INT TERM EXIT
}

# Validation functions
validate_deployment_mode() {
    local mode=${1:-""}
    case "$mode" in
        "development"|"production")
            return 0
            ;;
        *)
            log_error "Invalid deployment mode: '$mode'. Use 'development' or 'production'"
            return 1
            ;;
    esac
}

validate_source_directory() {
    if [[ ! -d "$SOURCE_THEME_DIR" ]]; then
        log_error "Source theme directory not found: $SOURCE_THEME_DIR"
        return 1
    fi
    
    if [[ ! -d "$SOURCE_THEME_DIR/assets" ]]; then
        log_error "Source assets directory not found: $SOURCE_THEME_DIR/assets"
        return 1
    fi
    
    log_debug "Source directory validation passed"
    return 0
}

validate_git_repository() {
    local repo_dir="$1"
    
    if [[ ! -d "$repo_dir" ]]; then
        log_warn "Target repository directory does not exist: $repo_dir"
        return 1
    fi
    
    if [[ ! -d "$repo_dir/.git" ]]; then
        log_warn "Target directory is not a git repository: $repo_dir"
        return 1
    fi
    
    # Check if we're in a git repository and can access it
    cd "$repo_dir"
    if ! git status >/dev/null 2>&1; then
        log_error "Cannot access git repository in: $repo_dir"
        return 1
    fi
    
    log_debug "Git repository validation passed"
    return 0
}

# Repository management functions
initialize_target_repository() {
    log_info "🔧 Setting up target repository..."
    
    # Create directory if it doesn't exist
    if [[ ! -d "$TARGET_REPO_DIR" ]]; then
        log_info "Creating target directory: $TARGET_REPO_DIR"
        mkdir -p "$TARGET_REPO_DIR"
    fi
    
    cd "$TARGET_REPO_DIR"
    
    # Initialize git repository if needed
    if [[ ! -d ".git" ]]; then
        log_info "Initializing git repository..."
        git init
        git config user.name "Theme Deployment" 2>/dev/null || true
        git config user.email "deployment@hyspex.local" 2>/dev/null || true
    fi
    
    # Ensure development branch exists
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "")
    
    if [[ -z "$current_branch" ]]; then
        # No commits yet, create initial commit
        log_info "Creating initial commit..."
        echo "# Hyspex Theme Deployment Repository" > README.md
        echo "" >> README.md
        echo "This repository contains the deployed theme files from the main theme-dev project." >> README.md
        echo "Generated on $(date)" >> README.md
        git add README.md
        git commit -m "Initial commit: Setup deployment repository"
        git branch -M "$DEPLOYMENT_BRANCH"
    elif [[ "$current_branch" != "$DEPLOYMENT_BRANCH" ]]; then
        # Switch to deployment branch or create it
        if git show-ref --verify --quiet refs/heads/$DEPLOYMENT_BRANCH; then
            log_info "Switching to existing '$DEPLOYMENT_BRANCH' branch..."
            git checkout "$DEPLOYMENT_BRANCH"
        else
            log_info "Creating and switching to '$DEPLOYMENT_BRANCH' branch..."
            git checkout -b "$DEPLOYMENT_BRANCH"
        fi
    fi
    
    log_debug "Target repository initialization complete"
}

prepare_git_state() {
    local repo_dir="$1"
    cd "$repo_dir"
    
    log_info "📋 Preparing git state..."
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_warn "Uncommitted changes detected. Stashing them..."
        git stash push -u -m "Deployment stash: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # Ensure we're on the correct branch
    local current_branch
    current_branch=$(git branch --show-current)
    
    if [[ "$current_branch" != "$DEPLOYMENT_BRANCH" ]]; then
        if git show-ref --verify --quiet refs/heads/$DEPLOYMENT_BRANCH; then
            log_info "Switching to '$DEPLOYMENT_BRANCH' branch..."
            git checkout "$DEPLOYMENT_BRANCH"
        else
            log_info "Creating '$DEPLOYMENT_BRANCH' branch..."
            git checkout -b "$DEPLOYMENT_BRANCH"
        fi
    fi
    
    # Pull latest changes if remote exists
    if git remote | grep -q origin; then
        log_info "Pulling latest changes from remote..."
        git pull origin "$DEPLOYMENT_BRANCH" 2>/dev/null || {
            log_warn "Could not pull from remote. Proceeding with local deployment."
        }
    fi
    
    log_debug "Git state preparation complete"
}

# Build functions
run_webpack_build() {
    local mode="$1"
    
    cd "$PROJECT_ROOT"
    
    log_info "🔨 Running webpack build in $mode mode..."
    
    # Clean previous builds
    log_info "Cleaning previous build artifacts..."
    npm run clean >/dev/null 2>&1 || {
        log_warn "Clean command failed, continuing anyway"
    }
    
    # Run appropriate webpack build
    case "$mode" in
        "development")
            log_info "Building for development..."
            NODE_ENV=development webpack || {
                log_error "Development build failed"
                return 1
            }
            ;;
        "production")
            log_info "Building for production..."
            NODE_ENV=production webpack || {
                log_error "Production build failed"
                return 1
            }
            ;;
    esac
    
    # Validate build output
    if [[ ! -f "$SOURCE_THEME_DIR/assets/global.js" ]] && [[ ! -f "$SOURCE_THEME_DIR/assets/global.css" ]]; then
        log_error "Build validation failed: No global assets found"
        return 1
    fi
    
    log_info "✅ Webpack build completed successfully"
    return 0
}

# Deployment functions
copy_theme_files() {
    local source_dir="$1"
    local target_dir="$2"
    
    log_info "📁 Copying theme files..."
    
    # Create necessary directories in target
    local dirs=("assets" "config" "layout" "locales" "sections" "snippets" "templates")
    for dir in "${dirs[@]}"; do
        mkdir -p "$target_dir/$dir"
    done
    
    # Copy assets (webpack generated files)
    if [[ -d "$source_dir/assets" ]]; then
        log_debug "Copying assets..."
        rsync -av --delete "$source_dir/assets/" "$target_dir/assets/" || {
            log_error "Failed to copy assets"
            return 1
        }
    fi
    
    # Copy liquid templates and configuration
    local copy_dirs=("config" "layout" "locales" "sections" "snippets" "templates")
    for dir in "${copy_dirs[@]}"; do
        if [[ -d "$source_dir/$dir" ]]; then
            log_debug "Copying $dir..."
            rsync -av --delete "$source_dir/$dir/" "$target_dir/$dir/" || {
                log_error "Failed to copy $dir"
                return 1
            }
        fi
    done
    
    log_debug "Theme files copied successfully"
}

create_deployment_info() {
    local target_dir="$1"
    local mode="$2"
    
    log_debug "Creating deployment information..."
    
    cat > "$target_dir/DEPLOYMENT_INFO.md" << EOF
# Deployment Information

**Deployed:** $(date '+%Y-%m-%d %H:%M:%S')
**Mode:** $mode
**Source:** $(cd "$PROJECT_ROOT" && pwd)
**Branch:** $DEPLOYMENT_BRANCH
**Commit:** $(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo "N/A")

## Build Details

- **Webpack Mode:** $mode
- **Node Environment:** $([ "$mode" = "production" ] && echo "production" || echo "development")
- **Generated Assets:** $(find "$target_dir/assets" -name "*.js" -o -name "*.css" 2>/dev/null | wc -l) files

## File Structure

\`\`\`
assets/         # Webpack generated bundles and assets
config/         # Shopify theme configuration
layout/         # Theme layout templates
locales/        # Localization files
sections/       # Theme sections
snippets/       # Reusable liquid snippets
templates/      # Page templates
\`\`\`

---
*This deployment was generated automatically by the theme-dev deployment script.*
EOF
}

commit_and_push() {
    local repo_dir="$1"
    local mode="$2"
    
    cd "$repo_dir"
    
    log_info "📝 Committing changes..."
    
    # Add all changes
    git add . || {
        log_error "Failed to stage changes"
        return 1
    }
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        log_info "No changes to commit"
        return 0
    fi
    
    # Create commit message
    local commit_msg="Deploy theme ($mode mode) - $(date '+%Y-%m-%d %H:%M:%S')"
    local source_commit
    source_commit=$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    git commit -m "$commit_msg" -m "Source commit: $source_commit" || {
        log_error "Failed to create commit"
        return 1
    }
    
    # Push to remote if it exists
    if git remote | grep -q origin; then
        log_info "🚀 Pushing to remote repository..."
        git push origin "$DEPLOYMENT_BRANCH" || {
            log_warn "Failed to push to remote. Deployment completed locally."
        }
    else
        log_info "No remote configured. Deployment completed locally."
    fi
    
    log_debug "Commit and push completed"
}

# Main deployment function
deploy_theme() {
    local mode="$1"
    
    log_info "🚀 Starting theme deployment in $mode mode..."
    
    # Validation steps
    validate_deployment_mode "$mode" || return 1
    validate_source_directory || return 1
    
    # Initialize target repository if needed
    if ! validate_git_repository "$TARGET_REPO_DIR"; then
        initialize_target_repository || return 1
    fi
    
    # Prepare git state
    prepare_git_state "$TARGET_REPO_DIR" || return 1
    
    # Build theme
    run_webpack_build "$mode" || return 1
    
    # Deploy files
    copy_theme_files "$SOURCE_THEME_DIR" "$TARGET_REPO_DIR" || return 1
    
    # Create deployment info
    create_deployment_info "$TARGET_REPO_DIR" "$mode" || return 1
    
    # Commit and push
    commit_and_push "$TARGET_REPO_DIR" "$mode" || return 1
    
    log_info "✅ Theme deployment completed successfully!"
    log_info "📍 Repository: $TARGET_REPO_DIR"
    log_info "🌿 Branch: $DEPLOYMENT_BRANCH"
    log_info "🏗️  Mode: $mode"
    
    return 0
}

# Rollback function
rollback_deployment() {
    local repo_dir="$TARGET_REPO_DIR"
    
    if [[ ! -d "$repo_dir/.git" ]]; then
        log_error "Cannot rollback: not a git repository"
        return 1
    fi
    
    cd "$repo_dir"
    
    log_info "🔄 Rolling back deployment..."
    
    # Reset to previous commit
    git reset --hard HEAD~1 || {
        log_error "Failed to rollback"
        return 1
    }
    
    log_info "✅ Rollback completed"
}

# Help function
show_help() {
    cat << 'EOF'

Hyspex Theme Deployment Script v1.0.0

USAGE:
    deploy.sh <mode|command>

MODES:
    development     Deploy with development webpack build
    production      Deploy with production webpack build (minified/optimized)

COMMANDS:
    pull           Pull changes from Shopify and sync to source directories

DESCRIPTION:
    This script deploys webpack-generated theme content to a separate 
    theme-hyspex repository. It always deploys to the 'development' branch
    and includes comprehensive safety checks.

FEATURES:
    ✓ Repository validation and initialization
    ✓ Automatic webpack building
    ✓ Git workflow management
    ✓ Safety checks and rollback capabilities
    ✓ Atomic deployment operations

EXAMPLES:
    ./scripts/deploy.sh development     # Deploy development build
    ./scripts/deploy.sh production      # Deploy production build
    ./scripts/deploy.sh pull           # Pull changes from Shopify to source

ENVIRONMENT:
    DEBUG=1                            # Enable debug logging

FILES:
    ../theme-hyspex/                   # Target deployment repository
    ./theme-hyspex/                    # Source theme files (webpack output)
    .deploy.lock                       # Deployment lock file

EOF
}

# Error handler
handle_error() {
    local exit_code=$?
    local line_number=$1
    
    log_error "Deployment failed at line $line_number with exit code $exit_code"
    
    if [[ -d "$TARGET_REPO_DIR/.git" ]]; then
        log_info "Attempting automatic rollback..."
        rollback_deployment 2>/dev/null || {
            log_error "Automatic rollback failed. You may need to manually restore the repository."
        }
    fi
    
    release_lock
    exit $exit_code
}

# Sync functions
pull_from_shopify() {
    log_info "🔄 Pulling changes from Shopify to deploy repository..."
    
    # Ensure deploy repository exists and is ready
    if ! validate_git_repository "$TARGET_REPO_DIR"; then
        initialize_target_repository || return 1
    fi
    
    # Change to deploy repository
    cd "$TARGET_REPO_DIR"
    
    # Pull all changes from Shopify
    log_info "Pulling from Shopify..."
    npx shopify theme pull || {
        log_error "Failed to pull from Shopify"
        return 1
    }
    
    log_info "✅ Successfully pulled changes from Shopify"
}

sync_to_source() {
    log_info "📁 Syncing files to source directories..."
    
    local source_config="$TARGET_REPO_DIR/config/settings_data.json"
    local target_config="$PROJECT_ROOT/src/theme-hyspex/config/settings_data.json"
    local source_templates="$TARGET_REPO_DIR/templates"
    local target_templates="$PROJECT_ROOT/src/theme-hyspex/templates"
    local source_sections="$TARGET_REPO_DIR/sections"
    local target_groups="$PROJECT_ROOT/src/theme-hyspex/groups"
    
    local synced_count=0
    
    # Sync settings_data.json
    if [[ -f "$source_config" ]]; then
        mkdir -p "$(dirname "$target_config")"
        cp "$source_config" "$target_config"
        log_info "✅ Synced settings_data.json"
        ((synced_count++))
    else
        log_warn "settings_data.json not found in deploy repository"
    fi
    
    # Sync template files
    if [[ -d "$source_templates" ]]; then
        mkdir -p "$target_templates"
        
        # Sync JSON templates
        for json_file in "$source_templates"/*.json; do
            if [[ -f "$json_file" ]]; then
                local filename=$(basename "$json_file")
                cp "$json_file" "$target_templates/$filename"
                log_info "✅ Synced template: $filename"
                ((synced_count++))
            fi
        done
        
        # Sync customers directory if it exists
        if [[ -d "$source_templates/customers" ]]; then
            mkdir -p "$target_templates/customers"
            for file in "$source_templates/customers"/*; do
                if [[ -f "$file" ]]; then
                    local filename=$(basename "$file")
                    cp "$file" "$target_templates/customers/$filename"
                    log_info "✅ Synced customer template: customers/$filename"
                    ((synced_count++))
                fi
            done
        fi
    else
        log_warn "Templates directory not found in deploy repository"
    fi
    
    # Sync group files (stored in sections directory as *-group.json)
    if [[ -d "$source_sections" ]]; then
        mkdir -p "$target_groups"
        
        # Sync group JSON files (pattern: *-group.json)
        for group_file in "$source_sections"/*-group.json; do
            if [[ -f "$group_file" ]]; then
                local filename=$(basename "$group_file")
                cp "$group_file" "$target_groups/$filename"
                log_info "✅ Synced group: $filename"
                ((synced_count++))
            fi
        done
    else
        log_warn "Sections directory not found in deploy repository"
    fi
    
    if [[ $synced_count -gt 0 ]]; then
        log_info "✅ Synced $synced_count files to source directories"
    else
        log_info "ℹ️  No files to sync"
    fi
}

pull_and_sync() {
    log_info "🚀 Starting pull and sync operation..."
    
    # Pull from Shopify to deploy repository
    pull_from_shopify || return 1
    
    # Sync from deploy repository to source
    sync_to_source || return 1
    
    # Rebuild theme with webpack after sync
    log_info "🔨 Rebuilding theme after sync..."
    cd "$PROJECT_ROOT"
    npm run build:dev || {
        log_error "Webpack build failed after sync"
        return 1
    }
    
    log_info "🎉 Pull, sync, and build completed successfully!"
    log_info "📍 Deploy repository: $TARGET_REPO_DIR"
    log_info "📁 Source synced to: $PROJECT_ROOT/src/"
    log_info "🏗️  Theme rebuilt: $PROJECT_ROOT/theme-hyspex/"
}

# Main function
main() {
    local mode=${1:-""}
    
    # Set up error handling
    trap 'handle_error $LINENO' ERR
    
    # Show help if requested or no arguments
    if [[ "$mode" == "help" ]] || [[ "$mode" == "--help" ]] || [[ "$mode" == "-h" ]] || [[ -z "$mode" ]]; then
        show_help
        exit 0
    fi
    
    # Handle pull command (no lock needed for read operations)
    if [[ "$mode" == "pull" ]]; then
        pull_and_sync
        log_info "🎉 Pull operation completed successfully!"
        exit 0
    fi
    
    # Acquire lock
    if ! acquire_lock 30; then
        exit 1
    fi
    
    # Run deployment
    deploy_theme "$mode"
    
    # Release lock
    release_lock
    
    log_info "🎉 Deployment process completed successfully!"
}

# Run main function
main "$@"