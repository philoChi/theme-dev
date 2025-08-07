# 🚀 AI Agent Workspace - MCP-Enhanced Docker Container

A comprehensive Docker environment for running Claude with full MCP (Model Context Protocol) support, Claude Flow integration, and complete development toolchain. Optimized for Shopify theme development and AI-powered workflows.

## ✨ Key Features

### 🔌 MCP Server Integration
- **Pre-configured MCP Servers**:
  - `filesystem` - Full workspace access
  - `github` - GitHub API integration
  - `memory` - Persistent memory storage
  - `fetch` - Web content fetching
  - `claude-flow` - AI orchestration
  - `puppeteer` - Browser automation
- **Automatic MCP Setup** - Servers configured on container start
- **Claude Configuration** - Ready-to-use `.claude/settings.json`

### 🌐 Network & Connectivity
- **Host Access** - Use `host.docker.internal` for localhost
- **Web Access** - Full internet connectivity
- **MCP Ports** - Exposed ports 3100-3105 for MCP servers (Dockerfile: 3100-3110)
- **Development Ports** - 3000, 3001, 8000, 8080, 9292

### 🛡️ Security & Performance
- **Non-root User** - Runs as `agent` user (UID 1000)
- **Resource Limits** - 4 CPUs, 8GB RAM (configurable)
- **Capability Dropping** - Minimal Linux capabilities
- **Secure Storage** - Persistent volumes for data

### 🛠️ Development Tools
- **Languages**: Node.js 20.x, Python 3.11, Ruby
- **AI Tools**: Claude Flow, OpenAI/Anthropic libraries
- **Shopify**: Shopify CLI, Theme tools
- **Testing**: Playwright with browsers
- **Version Control**: Git, GitHub CLI
- **Package Managers**: npm, yarn, pnpm, pip

## 📋 Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space
- API keys for services (optional but recommended)

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Navigate to docker directory
cd docker/

# Copy environment template
cp .env.example .env

# Edit .env with your API keys (IMPORTANT: Set GITHUB_TOKEN!)
nano .env
```

**Important environment variables**:
```env
# Required for MCP GitHub integration
GITHUB_TOKEN=your_github_token_here

# Required for AI features
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional for Shopify development
SHOPIFY_CLI_THEME_TOKEN=your_shopify_token_here
OPENAI_API_KEY=your_openai_key_here

# MCP Configuration (pre-configured)
MCP_ENABLE=true
MCP_AUTO_INSTALL=true
```

### 2. Build and Start Container

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# Enter the container
docker exec -it ai-agent-workspace-mcp bash
```

### 3. Verify MCP Setup

Inside the container:
```bash
# Check MCP servers
mcp-list

# Verify Claude Flow
cf --version

# Test MCP connectivity
npx claude-flow@alpha mcp start
```

## 📁 Project Structure

```
docker/
├── Dockerfile          # MCP-enhanced container definition
├── docker-compose.yml  # Service orchestration with MCP support
├── entrypoint.sh      # Startup script with automatic MCP setup
├── setup-mcp.sh       # MCP server installation helper
├── .env.example       # Environment template
├── .env               # Your configuration (create from .env.example)
├── backup/            # Backup of original files
└── README.md          # This comprehensive guide
```

## 🔧 Configuration Details

### Volume Mounts

| Volume | Purpose | Persistence |
|--------|---------|-------------|
| `../:/workspace` | Your project files | Host filesystem |
| `claude-config:/home/agent/.claude` | Claude & MCP config | Named volume |
| `claude-flow-data:/home/agent/.claude-flow` | Claude Flow data | Named volume |
| `npm-cache:/home/agent/.npm` | npm cache | Named volume |
| `yarn-cache:/home/agent/.cache/yarn` | yarn cache | Named volume |
| `~/.ssh:/home/agent/.ssh:ro` | SSH keys | Read-only |
| `~/.gitconfig:/home/agent/.gitconfig:ro` | Git config | Read-only |

### Exposed Ports

| Port | Service |
|------|---------|
| 9292 | Shopify theme development |
| 3000-3001 | Node.js applications |
| 8000-8080 | Python/FastAPI |
| 3100-3105 | MCP servers (6 ports mapped) |

### MCP Servers

**Pre-Configured MCP Servers (Built into Image):**

| Server | Purpose | When Added |
|--------|---------|------------|
| `filesystem` | Access `/workspace` directory | During build |
| `memory` | Persistent memory storage | During build |
| `fetch` | Web content retrieval | During build |
| `claude-flow` | AI agent orchestration | During build |
| `puppeteer` | Browser automation | During build |
| `github` | GitHub API operations | At startup (if GITHUB_TOKEN set) |

*Core servers are configured once during image build. GitHub MCP is added at startup only if GITHUB_TOKEN is provided.*

## 🗄️ Optional Services

The docker-compose.yml includes optional services for advanced workflows:

### Redis (Caching)
- **Image**: redis:7-alpine
- **Purpose**: Fast caching and session storage
- **Resources**: 0.5 CPU, 512MB RAM
- **Access**: `redis://redis:6379` from main container

### PostgreSQL (Database)  
- **Image**: postgres:15-alpine
- **Purpose**: Persistent data storage
- **Resources**: 1 CPU, 1GB RAM
- **Credentials**: User `agent`, Password from `POSTGRES_PASSWORD` env var
- **Access**: `postgres://agent:password@postgres:5432/agent_workspace`

**To use these services:**
```bash
# All services start automatically
docker-compose up -d

# Connect to Redis
docker-compose exec redis redis-cli

# Connect to PostgreSQL
docker-compose exec postgres psql -U agent -d agent_workspace
```

## 🎯 Usage Examples

### Working with MCP in Claude

**MCP servers are automatically configured using Claude CLI:**

```bash
# List all configured MCP servers
mcp-list

# Add a new MCP server
mcp-add server-name npx @modelcontextprotocol/server-name

# Remove an MCP server
mcp-remove server-name

# Test MCP connectivity
mcp-test

# Test MCP functionality (in Claude interface):
# - "List files in /workspace" (filesystem MCP)
# - "Show my GitHub repositories" (github MCP) 
# - "Remember this information: ..." (memory MCP)
# - "Fetch content from https://example.com" (fetch MCP)
```

### Claude Flow with MCP

```bash
# Initialize swarm with MCP coordination
cf swarm init --topology mesh --max-agents 5

# MCP will coordinate agents automatically
cf task orchestrate "Build a REST API with tests"

# Monitor with MCP integration
cf swarm status
```

### Accessing Host Services

```bash
# Access service running on host's localhost:3000
curl http://host.docker.internal:3000

# Connect to host's database
psql -h host.docker.internal -p 5432 -U myuser mydb
```

## 🛠️ Common Tasks

### Rebuild After Changes

```bash
# Quick rebuild with cache
docker-compose down
docker-compose up -d --build

# Full rebuild without cache
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Add New MCP Server

```bash
# Method 1: Inside container (manual)
npm install -g @modelcontextprotocol/server-name

# Method 2: Use helper script
./setup-mcp.sh

# Method 3: Edit configuration directly
nano ~/.claude/settings.json
# Add server config to mcpServers section
```

### Update Dependencies

```bash
# Update Dockerfile
nano Dockerfile

# Rebuild
docker-compose build --no-cache
```

## 🔍 Troubleshooting

### MCP Servers Not Working

```bash
# Check MCP configuration
cat ~/.claude/settings.json

# Reinstall MCP servers
./setup-mcp.sh

# Check logs
docker-compose logs -f ai-agent
```

### Host Access Issues

```bash
# Verify host.docker.internal
ping host.docker.internal

# Check extra_hosts in docker-compose.yml
# Should have: "host.docker.internal:host-gateway"
```

### Permission Problems

```bash
# Fix workspace permissions
sudo chown -R 1000:1000 ../

# Inside container
sudo chown -R agent:agent /workspace
```

### Memory/Performance Issues

```yaml
# Edit docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '8'      # Increase CPUs
      memory: 16G    # Increase memory
```

## 🎨 Helpful Aliases

The container includes these shortcuts:

| Alias | Command | Purpose |
|-------|---------|---------|
| `cf` | `npx claude-flow@alpha` | Claude Flow CLI |
| `mcp-list` | `claude mcp list` | List configured MCP servers |
| `mcp-add` | `claude mcp add` | Add new MCP server |
| `mcp-remove` | `claude mcp remove` | Remove MCP server |
| `swarm-init` | `cf swarm init` | Initialize AI swarm |
| `shopify-dev` | `npm run theme:dev` | Start Shopify development |
| `ws` | `cd $WORKSPACE` | Go to workspace |

## 🚦 Health Checks & Monitoring

**Automatic Health Monitoring:**
- **Check**: `node --version` (simple Node.js availability test)
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds  
- **Retries**: 3 attempts before marking unhealthy
- **Start Period**: 40 seconds (allows full container initialization)

```bash
# Check all services health status
docker-compose ps

# Detailed health status for main container
docker inspect ai-agent-workspace-mcp --format='{{.State.Health.Status}}'

# View health check history and logs
docker inspect ai-agent-workspace-mcp | jq '.[0].State.Health.Log'
```

## 🔄 Backup and Restore

### Backup Claude Configuration

```bash
# Backup MCP and Claude settings
docker run --rm -v claude-config:/data -v $(pwd):/backup alpine \
  tar czf /backup/claude-config-backup.tar.gz -C /data .
```

### Restore Configuration

```bash
# Restore from backup
docker run --rm -v claude-config:/data -v $(pwd):/backup alpine \
  tar xzf /backup/claude-config-backup.tar.gz -C /data
```

## 📊 Performance Optimization

### For Large Projects

```bash
# Increase inotify watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### For Heavy AI Workloads

```yaml
# docker-compose.yml adjustments
services:
  ai-agent:
    deploy:
      resources:
        limits:
          cpus: '16'
          memory: 32G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## 🤝 Contributing

To improve this setup:

1. Test changes thoroughly
2. Update documentation
3. Maintain backward compatibility
4. Keep security in mind

## 📝 Notes

- Container data persists in Docker volumes
- Your code is mounted from host filesystem
- MCP servers start automatically
- Claude configuration is preserved
- Logs available via `docker-compose logs`

## 🆘 Support & Resources

### Quick Diagnostics
```bash
# Check container health
docker-compose ps

# View logs
docker-compose logs -f ai-agent

# Inside container diagnostics
docker exec -it ai-agent-workspace-mcp bash
mcp-list  # Check MCP servers
cf --version  # Check Claude Flow
node --version && python3 --version  # Check tools
```

### Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Build Fails** | `docker-compose build` errors | Check Dockerfile syntax, free disk space (>10GB), Docker daemon running |
| **MCP Not Working** | `mcp-list` shows empty/errors | Set `GITHUB_TOKEN` in `.env`, rebuild container |
| **Port Conflicts** | "Port already in use" errors | Stop conflicting services: `sudo lsof -i :3000` then kill processes |
| **Memory Issues** | Container crashes/slow | Increase Docker memory limit (8GB min), check `docker stats` |
| **Permission Denied** | File access errors | Fix ownership: `sudo chown -R 1000:1000 ./` from host |
| **Container Won't Start** | Exit code 1/125 | Check logs: `docker-compose logs ai-agent`, verify .env file |

---

**Version**: 2.0.0 | **Last Updated**: July 2024 | **MCP Support**: Full