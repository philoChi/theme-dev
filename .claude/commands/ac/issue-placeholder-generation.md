---
allowed-tools: [TodoWrite, Bash]
description: "Operate an agent which creates placeholder for a specific github issue"
---

# /ac:issue-placeholder-generation - Agentic Coding

## Usage
```
/ac:issue-placeholder-generation [Github Issue]
```

## Arguments
- `Github Issue` - Issue you must pass to the agents you spawn <example>placeholder-generator(Github Issue <number>)</example>

## Purpose
Task: 
1. Invoke a @active-issue-checker agent to work on the provided issue.
2. Spawn a placeholder-generator agent to work on the provided issue.

**Important**
- Do **not** read or try to understand the github issue.
- Do **not** read any files or folder in the repository nor in github. 
- Do **not** read the repository structure. 
- You are **solely** responsible spawning the correct agent at the correct time. Decide what agent to spawn by the output of the former agent. 
