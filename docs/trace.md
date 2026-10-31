# @leo-logs/trace

`@leo-logs/trace` builds the ids that group OpenRouter calls into a pipeline session and an agent execution. It does not send the request. You call OpenRouter yourself and put the ids on that request.

```bash
npm install @leo-logs/trace
```

In this repository the package is `packages/trace`. It is not published to the public npm registry, so that install works only after it is published. Until then, depend on it from this workspace.

```typescript
import { createAgent, createPipeline, parseTraceId } from '@leo-logs/trace';
import type { Agent, ParsedTrace, Pipeline } from '@leo-logs/trace';
```

Requires Node `>=24 <25`.

## createPipeline

```typescript
function createPipeline(name: string): Pipeline
```

Starts one session of a pipeline. A pipeline is a group of agents orchestrated to complete a task. Call this once per run of the task. Call it again for the next run.

```typescript
const pipeline = createPipeline('support-reply');
```

| Member | Type | Meaning |
|---|---|---|
| `name` | `string` | The name, trimmed. |
| `id` | `string` | The uuid for this session. It does not change. |
| `sessionId()` | `() => string` | `pipeline:{name}-execution:{id}`. Put this on the OpenRouter request as `sessionId`. |
| `agent(name)` | `(name: string) => Agent` | One execution of an agent in this session. Call it again and you get another execution. |

`sessionId()` returns the same string every time you call it on this object. Every agent created from this same pipeline object returns that string from `agent.sessionId()`. A later `createPipeline('support-reply')` is a different session, with a new uuid.

## createAgent

```typescript
function createAgent(name: string, pipeline?: Pipeline): Agent
```

Starts one execution of an agent. An agent is one member of a pipeline, with a specific responsibility. Pass the pipeline when this execution belongs to that session. Omit it when the agent runs alone.

`pipeline.agent(name)` calls `createAgent(name, pipeline)`.

```typescript
const answer = pipeline.agent('answer');
const alone = createAgent('answer');
```

| Member | Type | Meaning |
|---|---|---|
| `name` | `string` | The name, trimmed. |
| `id` | `string` | The uuid for this execution. It does not change. |
| `pipeline` | `Pipeline`, if one was passed | The session this execution belongs to. Absent when the agent is alone. |
| `traceId()` | `() => string` | This execution. Put it on the request as `trace.traceId`. The same string every time you call it on this object. |
| `sessionId()` | `() => string \| null` | The pipeline session, or `null` when the agent is alone. |

With a pipeline, `traceId()` is `{pipeline session}_agent:{name}-execution:{id}`. Without one, it is `agent:{name}-execution:{id}`.

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({ apiKey });
const sessionId = answer.sessionId();

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'My package never arrived. Can you help?' }],
    ...(sessionId ? { sessionId } : {}),
    trace: { traceId: answer.traceId() },
  },
});
```

`@openrouter/agent` takes the same `sessionId` and `trace` fields on `callModel`.

Two agents in one session:

```typescript
const track = pipeline.agent('track');
const answer = pipeline.agent('answer');
```

`track.sessionId()` and `answer.sessionId()` are the same string, the pipeline session. `track.traceId()` and `answer.traceId()` are different, one execution each. A second `pipeline.agent('answer')` would be a third execution, with its own trace id.

Several model calls that pass the same `traceId()` are one execution. Create the agent once for that piece of work, and pass `agent.traceId()` on each of those calls.

## Names

A name may contain hyphens. Leading and trailing spaces are removed.

| Input | Result |
|---|---|
| `''` or whitespace | Throws `Pipeline name is empty` or `Agent name is empty`. |
| A name containing `_agent:` | Throws `Pipeline name cannot contain _agent:` or `Agent name cannot contain _agent:`. |
| A name that cannot form a trace id | Throws `Pipeline name cannot be used in a trace id` or `Agent name cannot be used in a trace id`. |

## parseTraceId

```typescript
function parseTraceId(traceId: string): ParsedTrace | null
```

Reads an id produced by this package. Returns `null` for anything else.

A pipeline id:

```typescript
{
  kind: 'pipeline',
  name: 'support-reply',
  id: '…uuid…',
  traceId: 'pipeline:support-reply-execution:…uuid…',
}
```

An agent id. `pipeline` is `null` when the agent was created alone.

```typescript
{
  kind: 'agent',
  name: 'answer',
  id: '…uuid…',
  traceId: 'pipeline:support-reply-execution:…_agent:answer-execution:…',
  pipeline: {
    name: 'support-reply',
    id: '…pipeline uuid…',
    traceId: 'pipeline:support-reply-execution:…',
  },
}
```

The log page uses this parse to decide which session and which agent a call belongs to.
