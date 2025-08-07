# Claude Flow aliases
alias cf='npx claude-flow@alpha'
alias swarm-init='cf swarm init'
alias swarm-status='cf swarm status'

# MCP aliases  
alias mcp-list='claude mcp list'
alias mcp-add='claude mcp add'
alias mcp-remove='claude mcp remove'
alias mcp-test='claude mcp list && echo "✅ MCP servers are configured"'

# Shopify aliases
alias shopify-dev='npm run theme:dev'
alias shopify-pull='npm run theme:pull'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline -10'

# Docker aliases
alias dc='docker-compose'
alias dps='docker ps'

# Navigation
alias ws='cd $WORKSPACE'
alias src='cd $WORKSPACE/src'

# Utility aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'
