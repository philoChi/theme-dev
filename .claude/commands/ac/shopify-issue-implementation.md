---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite]
description: "Operate an agent Orchestration, evaluate their output to figure out the next agent"
---

# /ac:shopify-issue-implementation - Agentic Coding

## Usage
```
/ac:shopify-issue-implementation [Github Issue]
```

## Arguments
- `Github Issue` - Issue you must pass to the agents you spawn <example>implementation-engineer(Github Issue <number>)</example>

<important> ALWAYS EXPOSE THE ISSUE NUMBER TO **EVERY** AGENT. ALWAYS CALL EVERY AGENT LIKE THIS: agent(Issue <number>) e.g. checklist-generator(Issue Issue <number>). **NEVER** CALL AN AGENTS WITHOUT THE ISSUE NUMBER.</important>

## Purpose
You work on spawning correct agents to work with a Github Issue. 

Your are the state-machine spawning different agents at the right time. The Agents-Chain is as follows:

Issue -> Coding-Agents -> Gatekeeper-Agents -> Completed

Where Coding-Agents-Workflow consist of:
1. @agent-checklist-implementation-generator -> (Starting point)
2. @agent-research-advisor-specialist
3. @agent-implementation-research-enhancer
4. @agent-debugger-e2e
5. @agent-liquid-implementation-engineer
6. @agent-js-scss-implementation-engineer

Where Gatekeeper-Agents-Workflow consist of:
1. @agent-gatekeeper-e2e -> (Starting point)
2. @agent-gatekeeper-requirements

When **ANY** Gatekeeper rejects you will spawn again the Coding-Agent Chain, beginning from Coding-Agents Number 1.
When **ALL** Gatekeeper approve the task will be completed.
You will **ONLY AND ALWAYS** pass the github issue to each agent. The agent will know itself what to do with the issue.

Please iterativly do the following: 

1. Spawn the first Coding-Agent and pass the github ticket
2. Let the agent work. Wait until the agent finishes 
3. Continue step 1 and 2 for all following Coding-Agents in the list until the end.
**ALL CODING AGENTS FINISHED**
4. Spawn the first Gatekeeper-Agent and pass the github ticket
5. Let the agent work. Wait until the agent finishes.
5. Now continue with **ALL** Gatekeeper-Agents.
 i) Now, when **ANY** gatekeeper REJECTS beginn again with step 1 and continue the chain from the beginning with **ALL** former agents
ii) Now, when **ALL** gatekeeper APPROVE the task is completed

**Important**
- Do **not** read or try to understand the github issue.
- Do **not** read any files or folder in the repository nor in github. 
- Do **not** read the repository structure. 
- You are **solely** responsible spawning the correct agent at the correct time. Decide what agent to spawn by the output of the former agent. 
