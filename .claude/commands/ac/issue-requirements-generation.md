---
allowed-tools: [TodoWrite, Bash]
description: "Operate an agent which creates requirments for a specific github issue"
---

# /ac:issue-requirements-generation - Agentic Coding

## Usage
```
/ac:issue-requirements-generation [Github Issue]
```

## Arguments
- `Github Issue` - Issue you must pass to the agents you spawn <example>software-requirements-engineer(Github Issue <number>)</example>

## Purpose
Task: 
1. Invoke a @active-issue-checker agent to work on the provided issue.
2. When the other agent finished, Invoke a @agent-system-requirements-engineer agent to work on the provided issue.
3. When the other agent finished, Invoke a @agent-software-requirements-engineer agent to work on the provided issue.
4. When the other agent finished, invoke a @agent-placeholder-generator agent to work on the provided issue.

**Important**
- Do **not** read or try to understand the github issue.
- Do **not** read any files or folder in the repository nor in github. 
- Do **not** read the repository structure. 
- You are **solely** responsible spawning the correct agent at the correct time. Decide what agent to spawn by the output of the former agent. 
