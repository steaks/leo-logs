# Leo Logs

OpenRouter logs for pipelines and agents.

`@leo-logs/trace` builds the id that groups a pipeline and the agents inside it. Callers use `@openrouter/agent` or `@openrouter/sdk` themselves and put that id on the request.

`@leo-logs/ui` serves the log page. The command is `leo-logs`.

Requires Node `>=24 <25`.

The docs site is VitePress. `npm run docs` serves it, and `npm run docs:build` writes `docs/.vitepress/dist`. The guide is Getting started, Integrate, @leo-logs/trace, Pipelines, Agents, The log page, and Run.

```bash
npm install
npm test
npm run build
```

## Trace ids

`createPipeline().sessionId()` returns `pipeline:{name}-execution:{uuid}`. `pipeline.agent(name).traceId()` returns `{pipeline session id}_agent:{name}-execution:{uuid}`. `agent.sessionId()` returns that pipeline session, or null when the agent has no pipeline. `createAgent().traceId()` returns `agent:{name}-execution:{uuid}` when the agent has no pipeline. Each uuid is chosen once, so the ids stay the same.

Put that string on the OpenRouter request as `trace.traceId`.

```typescript
import { OpenRouter as AgentClient } from '@openrouter/agent';
import { OpenRouter } from '@openrouter/sdk';
import { createPipeline } from '@leo-logs/trace';

const pipeline = createPipeline('my-pipeline');
const agent = pipeline.agent('simple');

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

`examples/calls.ts` runs an order desk for a late shipment. The pipeline is `order-desk`. `lookup` reads the order, then continues that conversation to check today's date. `policy` applies the refund rule, then continues to search for the carrier's status. `reply` calls `reply_tone` and continues that same chat to write the email. `lookup` and `policy` use `@openrouter/agent`. `reply` uses `@openrouter/sdk` `chat.send`. Each request uses the pipeline session id and that agent's trace id. A name may contain hyphens. It cannot contain `_agent:`.

## Logs

`leo-logs ui` listens on port `3000`. On this machine the page is [http://127.0.0.1:3000](http://127.0.0.1:3000).

```bash
npm run ui
```

OpenRouter posts each trace to `POST /traces` on that server. The spans are stored in SQLite. The file is `.leo-logs/logs.db`. `LEO_LOGS_DB` overrides that path. The first visit to a new log file asks you to create a username and password, then shows an access token and the OpenRouter webhook steps. Both are saved in the SQLite file. Later visits ask you to sign in. `LEO_LOGS_TOKEN`, when set, is that token instead of one created during setup.

The page lists pipelines and the agents recorded under them, plus agents called with no pipeline. A pipeline shows every row whose `trace_id` is that pipeline or starts with `{pipeline trace id}_agent:`. An agent shows rows with its exact `trace_id`. Each row has time, status, model, provider, tokens, cost, and duration. Opening a row shows input, output, and metadata.

The page reads the last 30 days, up to 200 rows. Older rows are deleted. A pipeline or agent appears after a trace for it has been posted.

On the VM, open ports 80 and 443 and point a DNS name at it. In the Caddyfile, replace `:80` with that hostname. Then:

```bash
docker compose up -d
```

Caddy requests a certificate for that hostname and serves the page there. The first visit asks you to create a username and password, then shows the access token and where to paste it in OpenRouter. The SQLite file stays on the `leo-logs` volume.
