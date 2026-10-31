# Integrate

`@leo-logs/trace` does not call the model. It names one run of a pipeline and one run of each agent in it. You put those names on the OpenRouter request you were already going to send. The log page reads them back from the broadcast. The function reference is [@leo-logs/trace](/trace).

## One task, two agents

`support-reply` answers a customer whose package never arrived. `track` finds the shipment. `answer` writes the reply. Both agents belong to the same run, so the session is one cost, one duration, and one failure count.

```typescript
import { OpenRouter } from '@openrouter/sdk';
import { createPipeline } from '@leo-logs/trace';

const pipeline = createPipeline('support-reply');
const track = pipeline.agent('track');
const answer = pipeline.agent('answer');

const client = new OpenRouter({ apiKey });

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Where is the package?' }],
    sessionId: track.sessionId(),
    trace: { traceId: track.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'My package never arrived. Can you help?' }],
    sessionId: answer.sessionId(),
    trace: { traceId: answer.traceId() },
  },
});
```

`sessionId` on the request is the pipeline session. It is the value Leo Logs reads back, so use `agent.sessionId()` there even if the app was already sending its own session id. Every agent created from that pipeline returns the same session id, so both calls land in one session. `trace.traceId` is that agent’s execution. Reuse the same agent object, and the same `traceId()`, on every model call that belongs to that execution. `pipeline.agent('answer')` a second time starts a second execution.

`@openrouter/agent` takes the same two fields on `callModel`: `sessionId` and `trace`.

## Ids

Each id is chosen once and then stays fixed for that object.

| Object | Method | Shape |
|---|---|---|
| Pipeline session | `pipeline.sessionId()` | `pipeline:{name}-execution:{uuid}` |
| Agent in a pipeline | `agent.traceId()` | `{pipeline session}_agent:{name}-execution:{uuid}` |
| Agent in a pipeline | `agent.sessionId()` | The pipeline session |
| Agent with no pipeline | `createAgent(name).traceId()` | `agent:{name}-execution:{uuid}` |
| Agent with no pipeline | `createAgent(name).sessionId()` | `null` |

A name may contain hyphens. It cannot contain `_agent:`.

An agent with no pipeline is its own row on the Agents page. Leave `sessionId` off the request, and put `traceId()` on `trace.traceId`.

`examples/calls.ts` is a longer task, `order-desk`, with three agents: `lookup`, `policy`, and `reply`.
