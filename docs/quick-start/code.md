# Code integration

Install `@leo-logs/trace` in the app that calls OpenRouter. It is in the npm organization `leo-logs`. It does not call the model. It builds the ids for one run of a pipeline and one run of an agent.

From this repo, one command runs `support-reply`, `claim-review`, `outage-update`, and `resume-screen`:

```bash
OPENROUTER_API_KEY=your-key npm run example
```

```bash
npm install @leo-logs/trace
```

`support-reply` answers a customer whose package never arrived. `track` finds the shipment. `answer` writes the reply.

```typescript
import { OpenRouter } from '@openrouter/sdk';
import { createPipeline } from '@leo-logs/trace';

// Group of agents orchestrated to complete a task.
const pipeline = createPipeline('support-reply');
// One agent in the pipeline with a specific responsibility.
const track = pipeline.agent('track');
const answer = pipeline.agent('answer');

const client = new OpenRouter({ apiKey });

pipeline.start();
track.info({ orderId: '1042' }, 'Looking up the order');

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

pipeline.end({ success: true, result: 'The package is in transit.' });
```

Create the pipeline once for this customer’s request. Create each agent once. Every model call in that agent’s work uses that same object.

`sessionId` is the pipeline session. Put `agent.sessionId()` there. Every agent created from that pipeline returns the same one, so `track` and `answer` are one run of the task. `trace.traceId` is that agent’s run. Put `agent.traceId()` there.

Calling `createPipeline` again starts another run of the task. Calling `pipeline.agent` again starts another run of that agent.

`@openrouter/agent` takes the same `sessionId` and `trace` fields on `callModel`.

## Logs

`debug`, `info`, `warn`, `error`, and `fatal` are on the pipeline and on the agent. A string is the message. An object first is extra fields, and the message is the second argument.

```typescript
pipeline.info('Customer asked where the package is');
pipeline.error({ err }, 'Carrier did not answer');
track.debug({ orderId: '1042' }, 'Looking up the order');
```

`pipeline.start()` marks the beginning of this run. `pipeline.end({ success, result })` marks the finish. `result` is a string or JSON. `success: false`, `error`, and `fatal` count as failures.

```typescript
pipeline.start();
pipeline.end({ success: false, result: { reason: 'no carrier' } });
```

Set both of these where the app runs. `LEO_LOGS_URL` is the website from [Deploy the Leo Logs website](/quick-start/web-app/deploy). `LEO_LOGS_TOKEN` is the bearer token on [Connect to OpenRouter](/quick-start/web-app/connect).

```bash
LEO_LOGS_URL=https://your-log-page
LEO_LOGS_TOKEN=the-bearer-token
```

The lines show on that pipeline’s session. **Kind** is `start`, `end`, or the level. **Message** is the text, or the end result. A line on an agent shows that agent’s name. Open a row to see the fields and, for an end, whether it succeeded.

If the website cannot be reached, the lines stay in `.leo-logs/outbox` and are sent the next time the app runs.

The next pipelines use that same `client`. Each one is a new task, so each one starts with its own `createPipeline`.

## claim-review

`claim-review` decides an insurance claim. `facts` reads what happened. `policy` checks what the policy covers. `decision` writes approve or deny.

```typescript
const pipeline = createPipeline('claim-review');
const facts = pipeline.agent('facts');
const policy = pipeline.agent('policy');
const decision = pipeline.agent('decision');

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'The pipe burst and flooded the kitchen.' }],
    sessionId: facts.sessionId(),
    trace: { traceId: facts.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Does the policy cover sudden water damage?' }],
    sessionId: policy.sessionId(),
    trace: { traceId: policy.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Write the approve or deny decision.' }],
    sessionId: decision.sessionId(),
    trace: { traceId: decision.traceId() },
  },
});
```

## outage-update

`outage-update` tells customers about an incident. `status` finds what is broken. `impact` names who is affected. `notice` writes the update.

```typescript
const pipeline = createPipeline('outage-update');
const status = pipeline.agent('status');
const impact = pipeline.agent('impact');
const notice = pipeline.agent('notice');

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Checkout has been failing for 20 minutes.' }],
    sessionId: status.sessionId(),
    trace: { traceId: status.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Which customers cannot pay?' }],
    sessionId: impact.sessionId(),
    trace: { traceId: impact.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Write the status page update.' }],
    sessionId: notice.sessionId(),
    trace: { traceId: notice.traceId() },
  },
});
```

## resume-screen

`resume-screen` reviews one applicant. `read` pulls the experience from the resume. `score` compares it to the role. `decision` writes advance or decline.

```typescript
const pipeline = createPipeline('resume-screen');
const read = pipeline.agent('read');
const score = pipeline.agent('score');
const decision = pipeline.agent('decision');

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Read this resume for the support role.' }],
    sessionId: read.sessionId(),
    trace: { traceId: read.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Score the resume against the role.' }],
    sessionId: score.sessionId(),
    trace: { traceId: score.traceId() },
  },
});

await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'Write advance or decline.' }],
    sessionId: decision.sessionId(),
    trace: { traceId: decision.traceId() },
  },
});
```
