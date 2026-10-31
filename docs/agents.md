# Agents

An agent is one member of a pipeline, with a specific responsibility.

`pipeline.agent('answer')` starts one execution of that agent. The execution has its own cost, duration, and failures, and it stays inside the pipeline session. In `support-reply`, `track` finds the shipment and `answer` writes the reply.

An agent can also be called with no pipeline, through `createAgent(name)`. It is then its own row, and it has no session.

## On the log page

| Screen | Address |
|---|---|
| Agents | `/agents` |
| One agent | `/executions?agent=answer&pipeline=support-reply` |
| Agent execution | `/execution?agent=answer&pipeline=support-reply&execution=pipeline:support-reply-execution:…_agent:answer-execution:…` |

Leave `pipeline` off when the agent was called on its own. An older `/agents?agent=…` address still opens the matching screen, then the address bar updates to `/executions` or `/execution`.

**Agents** is one row per agent. The same name under two pipelines is two rows. **Avg latency** is the average duration of individual model calls. **Avg cost** is the average cost of one agent execution.

**One agent** lists that agent’s executions. **Latency** there is the average call duration for that execution. **Pipeline session** is the session that contained it, and is blank when the agent ran alone.

**Agent execution** lists that execution’s model calls. **Latency** on a call is that call’s duration. A row opens the messages panel. Functions and Server open the function-call panel.

Filters are shared with Pipelines. They are listed on [The log page](/log-page).
