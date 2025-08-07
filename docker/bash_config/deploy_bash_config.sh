#!/bin/bash

# Simple Bash Configuration Deployment Script
# Deploys bash config files from docker/bash_config/ to /home/agent/

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SOURCE_DIR="docker/bash_config"
TARGET_DIR="/home/agent"
FILES_TO_DEPLOY=(".bashrc" ".bashrc_custom" ".bash_profile" ".bash_aliases" ".inputrc")

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $BLUE "🚀 Starting bash configuration deployment..."

# Verify we're in the right directory (should contain docker/bash_config)
if [ ! -d "$SOURCE_DIR" ]; then
    print_status $RED "❌ Error: Source directory '$SOURCE_DIR' not found!"
    print_status $YELLOW "   Make sure you're running this script from the workspace root"
    exit 1
fi

# Verify target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    print_status $RED "❌ Error: Target directory '$TARGET_DIR' not found!"
    exit 1
fi

print_status $GREEN "✅ Source and target directories verified"

# Check which source files exist
print_status $BLUE "📋 Checking source files..."
for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        print_status $GREEN "   ✅ Found: $file"
    else
        print_status $YELLOW "   ⚠️  Missing: $file (will skip)"
    fi
done

# Show existing files in target directory
print_status $BLUE "📋 Current files in target directory:"
for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$TARGET_DIR/$file" ]; then
        print_status $YELLOW "   📄 Exists: $file (will be overwritten)"
    else
        print_status $GREEN "   ➕ New: $file"
    fi
done

echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status $YELLOW "⏹️  Deployment cancelled by user"
    exit 0
fi

# Deploy files
print_status $BLUE "🚀 Deploying configuration files..."
deployed_count=0

# Deploy each file individually
if [ -f "$SOURCE_DIR/.bashrc" ]; then
    cp "$SOURCE_DIR/.bashrc" "$TARGET_DIR/.bashrc"
    print_status $GREEN "   ✅ Deployed: .bashrc"
    ((deployed_count++))
fi

if [ -f "$SOURCE_DIR/.bashrc_custom" ]; then
    cp "$SOURCE_DIR/.bashrc_custom" "$TARGET_DIR/.bashrc_custom"
    print_status $GREEN "   ✅ Deployed: .bashrc_custom"
    ((deployed_count++))
fi

if [ -f "$SOURCE_DIR/.bash_profile" ]; then
    cp "$SOURCE_DIR/.bash_profile" "$TARGET_DIR/.bash_profile"
    print_status $GREEN "   ✅ Deployed: .bash_profile"
    ((deployed_count++))
fi

if [ -f "$SOURCE_DIR/.bash_aliases" ]; then
    cp "$SOURCE_DIR/.bash_aliases" "$TARGET_DIR/.bash_aliases"
    print_status $GREEN "   ✅ Deployed: .bash_aliases"
    ((deployed_count++))
fi

if [ -f "$SOURCE_DIR/.inputrc" ]; then
    cp "$SOURCE_DIR/.inputrc" "$TARGET_DIR/.inputrc"
    print_status $GREEN "   ✅ Deployed: .inputrc"
    ((deployed_count++))
fi

# Validate deployment
print_status $BLUE "🔍 Validating deployment..."
validation_passed=true

for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ] && [ -f "$TARGET_DIR/$file" ]; then
        # Check if files have the same content
        if cmp -s "$SOURCE_DIR/$file" "$TARGET_DIR/$file"; then
            print_status $GREEN "   ✅ Validated: $file"
        else
            print_status $RED "   ❌ Validation failed: $file (content mismatch)"
            validation_passed=false
        fi
    fi
done

# Final status
echo ""
if [ "$validation_passed" = true ] && [ "$deployed_count" -gt 0 ]; then
    print_status $GREEN "🎉 Deployment completed successfully!"
    print_status $GREEN "   📊 Files deployed: $deployed_count"
    print_status $BLUE "   💡 Run 'source ~/.bashrc' or restart your shell to apply changes"
else
    print_status $RED "⚠️  Deployment completed with issues"
    if [ "$deployed_count" -eq 0 ]; then
        print_status $YELLOW "   📊 No files were deployed"
    fi
fi

print_status $BLUE "✨ Done!"