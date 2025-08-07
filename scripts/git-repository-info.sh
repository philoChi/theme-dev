#!/bin/bash

# git-repository-info.sh - Extract GitHub repository information from current git repository
# Usage: ./git-repository-info.sh [--format=default|json|env]

set -euo pipefail

# Default format
FORMAT="default"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format=*)
            FORMAT="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--format=default|json|env]"
            echo ""
            echo "Extract GitHub repository information from current git repository"
            echo ""
            echo "Formats:"
            echo "  default - Human readable output (default)"
            echo "  json    - JSON formatted output"
            echo "  env     - Shell environment variables"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository" >&2
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "HEAD")

# Get remote URL (prefer origin, fallback to first remote)
REMOTE_URL=""
if git remote | grep -q "^origin$"; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
else
    FIRST_REMOTE=$(git remote | head -n1 2>/dev/null || echo "")
    if [[ -n "$FIRST_REMOTE" ]]; then
        REMOTE_URL=$(git remote get-url "$FIRST_REMOTE" 2>/dev/null || echo "")
    fi
fi

if [[ -z "$REMOTE_URL" ]]; then
    echo "Error: No remote repository found" >&2
    exit 1
fi

# Parse GitHub repository information from URL
parse_github_url() {
    local url="$1"
    local owner=""
    local repo=""
    
    # Handle SSH format: git@github.com:owner/repo.git
    if [[ "$url" =~ ^git@github\.com:([^/]+)/(.+)\.git$ ]]; then
        owner="${BASH_REMATCH[1]}"
        repo="${BASH_REMATCH[2]}"
    # Handle HTTPS format: https://github.com/owner/repo.git
    elif [[ "$url" =~ ^https://github\.com/([^/]+)/(.+)\.git$ ]]; then
        owner="${BASH_REMATCH[1]}"
        repo="${BASH_REMATCH[2]}"
    # Handle HTTPS format without .git: https://github.com/owner/repo
    elif [[ "$url" =~ ^https://github\.com/([^/]+)/([^/]+)/?$ ]]; then
        owner="${BASH_REMATCH[1]}"
        repo="${BASH_REMATCH[2]}"
    else
        echo "Error: Unable to parse GitHub URL: $url" >&2
        exit 1
    fi
    
    echo "$owner|$repo"
}

# Parse the remote URL
PARSED=$(parse_github_url "$REMOTE_URL")
OWNER=$(echo "$PARSED" | cut -d'|' -f1)
REPO=$(echo "$PARSED" | cut -d'|' -f2)

# Construct GitHub HTTPS URL
GITHUB_URL="https://github.com/$OWNER/$REPO"

# Get tracking branch information
TRACKING_BRANCH=""
if git rev-parse --abbrev-ref --symbolic-full-name @{u} > /dev/null 2>&1; then
    TRACKING_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
fi

# Get active ticket information
ACTIVE_ISSUE=""
ACTIVE_ISSUE_FILE="utils/active-ticket.md"
if [[ -f "$ACTIVE_ISSUE_FILE" ]]; then
    # Extract issue number and title from the first line that contains "Issue #"
    ACTIVE_ISSUE=$(grep -m 1 "^\*\*Issue #" "$ACTIVE_ISSUE_FILE" 2>/dev/null | sed 's/^\*\*Issue #\([0-9]*\)\*\*: \(.*\)/Issue #\1: \2/' || echo "")
    # If no issue format found, try to get the first non-empty line after the title
    if [[ -z "$ACTIVE_ISSUE" ]]; then
        ACTIVE_ISSUE=$(head -n 5 "$ACTIVE_ISSUE_FILE" 2>/dev/null | grep -v "^#" | grep -v "^$" | head -n 1 | sed 's/^\*\*//' | sed 's/\*\*$//' || echo "No active ticket")
    fi
else
    ACTIVE_ISSUE="No active ticket (utils/active-ticket.md not found)"
fi

# Output based on format
case "$FORMAT" in
    "json")
        cat << EOF
{
  "owner": "$OWNER",
  "repo": "$REPO",
  "repository": "$OWNER/$REPO",
  "github_url": "$GITHUB_URL",
  "current_branch": "$CURRENT_BRANCH",
  "remote_url": "$REMOTE_URL",
  "tracking_branch": "$TRACKING_BRANCH",
  "active_issue": "$ACTIVE_ISSUE"
}
EOF
        ;;
    "env")
        cat << EOF
export GIT_OWNER="$OWNER"
export GIT_REPO="$REPO"
export GIT_REPOSITORY="$OWNER/$REPO"
export GIT_GITHUB_URL="$GITHUB_URL"
export GIT_CURRENT_BRANCH="$CURRENT_BRANCH"
export GIT_REMOTE_URL="$REMOTE_URL"
export GIT_TRACKING_BRANCH="$TRACKING_BRANCH"
export GIT_ACTIVE_ISSUE="$ACTIVE_ISSUE"
EOF
        ;;
    "default"|*)
        echo "Repository: $OWNER/$REPO"
        echo "GitHub URL: $GITHUB_URL"
        echo "Current Branch: $CURRENT_BRANCH"
        echo "Remote Origin: $REMOTE_URL"
        if [[ -n "$TRACKING_BRANCH" ]]; then
            echo "Tracking Branch: $TRACKING_BRANCH"
        fi
        echo "Active Ticket: $ACTIVE_ISSUE"
        ;;
esac