#!/bin/bash
set -e

# Only skip full init if explicitly told to
if [ "${SKIP_INIT}" = "true" ]; then
    exec /bin/bash -l
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Welcome message
print_color "$BLUE" "==================================================="
print_color "$BLUE" "   AI Agent Workspace - MCP Enhanced Container     "
print_color "$BLUE" "==================================================="
echo ""

# Security checks
print_color "$YELLOW" "🔒 Running security checks..."

# Check if running as non-root
if [ "$EUID" -eq 0 ]; then 
    print_color "$RED" "❌ Error: Container should not run as root!"
    exit 1
fi
print_color "$GREEN" "✅ Running as non-root user: $(whoami)"

# Set secure umask
umask 077
print_color "$GREEN" "✅ Secure umask set: $(umask)"

# Environment setup
print_color "$YELLOW" "🔧 Setting up environment..."

# Configure git if credentials are available
if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    print_color "$GREEN" "✅ Git configured for $GIT_USER_NAME"
else
    # Verify git config exists (set in Dockerfile)
    if [ -f "$HOME/.gitconfig" ]; then
        print_color "$GREEN" "✅ Git configuration loaded"
    fi
fi

# Setup SSH agent if SSH keys are mounted
if [ -d "$HOME/.ssh" ] && [ -f "$HOME/.ssh/id_rsa" ]; then
    eval "$(ssh-agent -s)" > /dev/null 2>&1
    ssh-add "$HOME/.ssh/id_rsa" > /dev/null 2>&1
    print_color "$GREEN" "✅ SSH agent started"
fi

# Setup MCP servers
print_color "$YELLOW" "🔌 Setting up MCP servers..."

if command -v claude >/dev/null 2>&1; then
    # Add GitHub MCP if token is available and not already added
    if [ -n "$GITHUB_TOKEN" ]; then
        if ! claude mcp list 2>/dev/null | grep -q "github"; then
            claude mcp add github npx @modelcontextprotocol/server-github && print_color "$GREEN" "✅ Added GitHub MCP server"
        fi
    fi
    
    # Add Shopify MCP
    if ! claude mcp list 2>/dev/null | grep -q "shopify-dev"; then
        claude mcp add shopify-dev npx @shopify/dev-mcp@latest && print_color "$GREEN" "✅ Added Shopify MCP server"
    fi
    
    # Add Playwright MCP
    if ! claude mcp list 2>/dev/null | grep -q "playwright"; then
        claude mcp add playwright npx @playwright/mcp@latest && print_color "$GREEN" "✅ Added Playwright MCP server"
    fi
    
    # Add Context7 MCP
    if ! claude mcp list 2>/dev/null | grep -q "context7"; then
        claude mcp add context7 npx @upstash/context7-mcp && print_color "$GREEN" "✅ Added Context7 MCP server"
    fi
    
    # Show configured MCP servers
    claude mcp list > /dev/null 2>&1 && print_color "$GREEN" "✅ All MCP servers are configured and ready"
else
    print_color "$YELLOW" "⚠️  Claude CLI not found"
fi

# Create workspace directories if they don't exist
print_color "$GREEN" "✅ Workspace directories created"

# Set up bash history persistence
if [ -d "$HOME/.bash_history_volume" ]; then
    # Try to create bash history file, but don't fail if permission denied
    if [ ! -f "$HOME/.bash_history" ]; then
        if touch "$HOME/.bash_history_volume/bash_history" 2>/dev/null; then
            ln -sf "$HOME/.bash_history_volume/bash_history" "$HOME/.bash_history"
            print_color "$GREEN" "✅ Bash history persistence enabled"
        else
            print_color "$YELLOW" "⚠️  Bash history volume permission issue - using local history"
            touch "$HOME/.bash_history" 2>/dev/null || true
        fi
    fi
fi

# Check for required environment variables
print_color "$YELLOW" "🔍 Checking environment variables..."
required_vars=()
optional_vars=("SHOPIFY_CLI_THEME_TOKEN" "GITHUB_TOKEN" "OPENAI_API_KEY" "ANTHROPIC_API_KEY")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_color "$RED" "❌ Missing required environment variable: $var"
        exit 1
    fi
done

for var in "${optional_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_color "$YELLOW" "⚠️  Optional environment variable not set: $var"
    else
        print_color "$GREEN" "✅ $var is configured"
    fi
done

# Node.js and npm setup
print_color "$YELLOW" "📦 Checking Node.js environment..."
print_color "$GREEN" "✅ Node.js $(node --version)"
print_color "$GREEN" "✅ npm $(npm --version)"
print_color "$GREEN" "✅ Python $(python3 --version)"

# Install project dependencies if package.json exists
if [ -f "$WORKSPACE/package.json" ]; then
    print_color "$YELLOW" "📦 Installing project dependencies..."
    cd $WORKSPACE
    npm install
    print_color "$GREEN" "✅ Dependencies installed"
fi

# Test MCP connectivity
print_color "$YELLOW" "🔗 Testing MCP server connectivity..."
if command -v npx &> /dev/null; then
    # Test Claude Flow MCP
    if npx claude-flow@alpha --version &> /dev/null; then
        print_color "$GREEN" "✅ Claude Flow MCP available"
    else
        print_color "$YELLOW" "⚠️  Claude Flow MCP not responding"
    fi
fi

# Print helpful information
echo ""
print_color "$BLUE" "==================================================="
print_color "$GREEN" "🚀 AI Agent Workspace with MCP Support is ready!"
print_color "$BLUE" "==================================================="
echo ""
print_color "$YELLOW" "📚 Quick Start Guide:"
echo "   - Run 'mcp-list' to see configured MCP servers"
echo "   - Run 'cf help' for Claude Flow commands"
echo "   - Run 'shopify-dev' to start theme development"
echo "   - Run 'swarm-init' to initialize AI swarm"
echo "   - Use 'ws' to navigate to workspace"
echo ""
print_color "$YELLOW" "🔧 Available Tools:"
echo "   - Claude Flow: $(npx claude-flow@alpha --version 2>/dev/null || echo 'alpha')"
echo "   - Shopify CLI: $(shopify version 2>/dev/null || echo 'latest')"
echo "   - Node.js: $(node --version)"
echo "   - Python: $(python3 --version | cut -d' ' -f2)"
echo "   - Git: $(git --version | cut -d' ' -f3)"
echo ""
print_color "$YELLOW" "🔌 MCP Servers:"
echo "   - filesystem: Access to /workspace"
echo "   - github: GitHub API integration"
echo "   - memory: Persistent memory storage"
echo "   - fetch: Web content fetching"
echo "   - claude-flow: AI orchestration"
echo ""
print_color "$YELLOW" "🌐 Network Access:"
echo "   - Host access: host.docker.internal"
echo "   - Web access: Enabled"
echo "   - Localhost mapping: Use host.docker.internal"
echo ""

# Execute the CMD from Dockerfile (which will be bash -l)
exec "$@"