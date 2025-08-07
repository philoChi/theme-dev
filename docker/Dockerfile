# Multi-stage build for secure AI Agent workspace with MCP support
FROM ubuntu:22.04 AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20.18.0 \
    PYTHON_VERSION=3.11 \
    CLAUDE_FLOW_VERSION=alpha \
    SHOPIFY_CLI_VERSION=latest \
    HOME=/home/agent \
    WORKSPACE=/workspace \
    CLAUDE_HOME=/home/agent/.claude 

# Security updates and essential packages
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    wget \
    sudo \
    build-essential \
    software-properties-common \
    openssh-client \
    jq \
    zip \
    unzip \
    htop \
    vim \
    nano \
    netcat \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (for Claude Flow, Shopify CLI, and development)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn pnpm && \
    node --version && npm --version

# Install global npm packages as root (before switching to non-root user)
RUN npm install -g \
    @shopify/cli@latest \
    @shopify/theme@latest \
    @anthropic-ai/claude-code \
    typescript \
    ts-node \
    nodemon \
    pm2 \
    concurrently \
    wait-on \
    cross-env \
    dotenv-cli \
    prettier \
    eslint \
    jest \
    @playwright/test \
    webpack \
    webpack-cli \
    sass

# Install Playwright browsers as root (requires elevated permissions)
RUN npx playwright install --with-deps \
        chromium \
        chrome \
        firefox 

# Install Python, Ruby, and GitHub CLI (consolidated)
RUN add-apt-repository ppa:deadsnakes/ppa && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-dev \
    python${PYTHON_VERSION}-venv \
    python3-pip \
    ruby-full \
    ruby-bundler \
    gh \
    && rm -rf /var/lib/apt/lists/* && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1 && \
    update-alternatives --set python3 /usr/bin/python${PYTHON_VERSION}

# Install Docker CLI (for Docker-in-Docker scenarios if needed)  
RUN curl -fsSL https://get.docker.com | sh

# Create non-root user for security
RUN groupadd -g 1000 agent && \
    useradd -m -u 1000 -g agent -s /bin/bash agent && \
    echo "agent ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    mkdir -p ${WORKSPACE} ${CLAUDE_HOME} && \
    chown -R agent:agent ${HOME} ${WORKSPACE}

# Switch to non-root user
USER agent

# Copy bash configuration files
COPY --chown=agent:agent bash_config/.bashrc ${HOME}/.bashrc
COPY --chown=agent:agent bash_config/.bash_profile ${HOME}/.bash_profile
COPY --chown=agent:agent bash_config/.bashrc_custom ${HOME}/.bashrc_custom
COPY --chown=agent:agent bash_config/.bash_aliases ${HOME}/.bash_aliases

# Ensure proper permissions on bash files
RUN chmod 644 ${HOME}/.bashrc ${HOME}/.bash_profile ${HOME}/.bashrc_custom ${HOME}/.bash_aliases

WORKDIR ${WORKSPACE}

# Install Python packages for AI/ML
RUN pip3 install --user --upgrade pip && \
    pip3 install --user \
    requests \
    python-dotenv \
    pyyaml \
    numpy \
    pandas \
    openai \
    anthropic \
    langchain \
    chromadb \
    tiktoken \
    rich \
    click \
    fastapi \
    uvicorn \
    httpx \
    websockets

# Setup Claude directories
RUN mkdir -p ${CLAUDE_HOME}/{commands,logs,cache,mcp-servers} && \
    mkdir -p ${HOME}/.config/claude

# Initialize Git configuration properly
RUN git config --global user.name "Filo" && \
    git config --global user.email "e@example.com" && \
    git config --global init.defaultBranch main && \
    git config --global core.autocrlf false && \
    git config --global pull.rebase false && \
    git config --global alias.s status && \
    git config --global alias.cob "checkout -b" && \
    git config --global alias.com "commit -m" && \
    git config --global alias.bra "branch -a -vv" && \
    chmod 644 ${HOME}/.gitconfig

# Setup Claude Flow
RUN npx claude-flow@alpha init --force

# Copy setup scripts
COPY --chown=agent:agent entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set up SSH for GitHub (optional)
RUN mkdir -p ${HOME}/.ssh && \
    chmod 700 ${HOME}/.ssh && \
    ssh-keyscan -t rsa github.com >> ${HOME}/.ssh/known_hosts

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version && npm --version && python3 --version || exit 1

# Expose common development ports
EXPOSE 3000 3001 4000 5000 8000 8080 9292

# Expose MCP server ports
EXPOSE 3100-3110

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command - use login shell to ensure .bashrc is sourced
CMD ["/bin/bash", "-l"]
