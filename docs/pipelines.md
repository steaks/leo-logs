# Pipelines

A pipeline is a named run of OpenRouter calls. The log page lists each pipeline, then the sessions inside it, then the calls in a session.

You still send the calls with `@openrouter/agent` or `@openrouter/sdk`. Leo Logs supplies the trace id that makes those calls one pipeline. The package name is `@leo-logs/trace`.

## Trace id

`createPipeline(name).sessionId()` returns `pipeline:{name}-execution:{uuid}`. The uuid is chosen once, so the id stays the same for that run. Put it on the OpenRouter request as `trace.traceId`.

```typescript
import { createPipeline } from '@leo-logs/trace';

const pipeline = createPipeline('order-desk');
const traceId = pipeline.sessionId();
```

A name may contain hyphens. It cannot contain `_agent:`.

Calls that use this id, and agent calls whose trace id starts with `{pipeline session id}_agent:`, belong to the same session.

`examples/calls.ts` is one pipeline, `order-desk`, handling a late shipment. The agents inside it are `lookup`, `policy`, and `reply`.

## On the log page

| Screen | Address |
|---|---|
| Pipelines | `/` |
| One pipeline | `/sessions?pipeline=order-desk` |
| One session | `/session?pipeline=order-desk&session=pipeline:order-desk-execution:…` |

**Pipelines** is one row per pipeline name. **Avg cost** is the mean cost of one session. **P50 cost**, **P75 cost**, **P90 cost**, and **P95 cost** are percentiles of those same session costs. **Avg latency** is the mean wall-clock time from the first call start to the last call end. **Avg model time** is the mean of each session's summed call durations. Overlapping calls both count in model time.

**Avg latency**, **Avg model time**, and the four cost percentiles start hidden. Turn them on from **Columns**.

The Agents count opens a side panel of the agents in that pipeline.

**One pipeline** lists sessions. **Latency** is that session's wall-clock span. **Model time** is the sum of its call durations. Those two columns start hidden. Stats above the table include input, output, and cached tokens, plus the same cost percentiles for the sessions on screen.

**One session** lists that session's model calls, including its agents. **Latency** on a call is that call's duration. A row opens the messages panel. Functions and Server open the function-call panel. A function result is joined back to the original call by call id, so the panel can show the description and schema.

Shared filters, on this page and on Agents:

| Parameter | Meaning |
|---|---|
| `window` | `hour`, `day`, `week`, or `month`. Omitted means the past 30 days. |
| `model` | Repeat for each selected model. |
| `q` | Name filter. |
| `failures` | `1` shows rows with failures only. |
