# Agents

An agent is a named caller in the OpenRouter logs. Inside a pipeline, its calls roll up under that pipeline session. Called on its own, it is its own row.

You still send the calls with `@openrouter/agent` or `@openrouter/sdk`. Leo Logs supplies the trace id that marks those calls as that agent. The package name is `@leo-logs/trace`.

## Trace id

`createAgent(name).traceId()` returns `agent:{name}-execution:{uuid}`. Pass a pipeline and the id is `{pipeline session id}_agent:{name}-execution:{uuid}`. The uuid is chosen once, so the id stays the same for that execution. Put it on the OpenRouter request as `trace.traceId`.

```typescript
import { OpenRouter as AgentClient } from '@openrouter/agent';
import { OpenRouter } from '@openrouter/sdk';
import { createAgent, createPipeline } from '@leo-logs/trace';

const pipeline = createPipeline('order-desk');
const agent = createAgent('lookup', pipeline);

const agentClient = new AgentClient({ apiKey });
agentClient.callModel({
  model: 'z-ai/glm-5.3-flash',
  input: 'Say hello in one sentence.',
  trace: { traceId: agent.traceId() },
});

const client = new OpenRouter({ apiKey });
await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
    trace: { traceId: agent.traceId() },
  },
});
```

A name may contain hyphens. It cannot contain `_agent:`.

In `examples/calls.ts`, `lookup` reads the order and then checks today's date. `policy` applies the refund rule and then searches for the carrier's status. `reply` calls `reply_tone` and then writes the email. `lookup` and `policy` use `@openrouter/agent`. `reply` uses `@openrouter/sdk` `chat.send`.

## On the log page

| Screen | Address |
|---|---|
| Agents | `/agents` |
| One agent | `/executions?agent=lookup&pipeline=order-desk` |
| Agent execution | `/execution?agent=lookup&pipeline=order-desk&execution=pipeline:order-desk-execution:…_agent:lookup-execution:…` |

Leave `pipeline` off when the agent was called on its own. An older `/agents?agent=…` address still opens the matching screen, then the address bar updates to `/executions` or `/execution`.

**Agents** is one row per agent. The same name under two pipelines is two rows. **Avg latency** is the average duration of individual model calls. **Avg cost** is the average cost of one agent execution.

**One agent** lists that agent's executions. **Latency** there is the average call duration for that execution. **Pipeline session** is the pipeline run that contained it, and is blank when the agent ran alone.

**Agent execution** lists that trace's model calls. **Latency** on a call is that call's duration. A row opens the messages panel. Functions and Server open the function-call panel.
