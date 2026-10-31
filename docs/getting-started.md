# Getting started

A model call is the wrong unit once a task takes more than one. The cost, the time, and the failure belong to the task, and to the agent that did each part of it. OpenRouter records the calls. Leo Logs groups them.

The log server walks through three steps. These addresses are on that server, such as `http://127.0.0.1:3000/getting-started/account`, not on this docs site.

| Step | Address |
|---|---|
| Account | `/getting-started/account` |
| Connect to OpenRouter | `/getting-started/openrouter` |
| Integrate the code | `/getting-started/code` |

## 1. Account

Create a username and a password for the log page on this machine. Enter the password twice. It must be at least 8 characters.

## 2. Connect to OpenRouter

This step creates an access token for this log file. OpenRouter sends it on every trace.

1. Open [Settings → Observability](https://openrouter.ai/settings/observability).
2. Toggle the **Enable Broadcast** switch to turn on the feature.
3. Scroll down to configure a webhook destination. Click **Set Up**.
4. Set the URL to the traces URL shown on the page. It ends in `/traces`. OpenRouter has to be able to POST to it. `http://127.0.0.1:3000/traces` only works from this machine, so a broadcast from OpenRouter never arrives. Use a host OpenRouter can reach. [Run](/run) covers the VM.
5. Set the headers to the bearer JSON shown on the page.
6. Scroll to **Additional generation metadata**. Check **Cost**, **Identity**, **Request context**, and **Cost allocation**.
7. Click the **Add** button at the top right of the screen.

[OpenRouter’s Broadcast guide](https://openrouter.ai/docs/guides/features/broadcast) is linked from the top right of that step. Settings keeps a copy of these steps after setup is finished.

## 3. Integrate the code

Install `@leo-logs/trace`. A pipeline is a group of agents orchestrated to complete a task. An agent is one of them, with a specific responsibility.

```bash
npm install @leo-logs/trace
```

```typescript
import { OpenRouter } from '@openrouter/sdk';
import { createPipeline } from '@leo-logs/trace';

// Group of agents orchestrated to complete a task.
const pipeline = createPipeline('support-reply');
// One agent in the pipeline with a specific responsibility.
const agent = pipeline.agent('answer');

const client = new OpenRouter({ apiKey });
await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'My package never arrived. Can you help?' }],
    sessionId: agent.sessionId(),
    trace: { traceId: agent.traceId() },
  },
});
```

`support-reply` is the task: answering this customer. `answer` is the agent that writes the reply. Create the pipeline once for this customer’s request. Create `answer` once, and reuse that same object on every model call the reply takes. Calling `createPipeline` again starts another session. Calling `agent` again starts another execution. A second agent in the same task would be `track`, the one that finds the shipment. [Integrate](/integrate) shows that pair. [@leo-logs/trace](/trace) is the reference for the package.

**Go to logs** finishes setup. Later visits ask you to sign in.
