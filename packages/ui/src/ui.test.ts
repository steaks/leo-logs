import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { TraceQuery } from './query';
import { createAgent, createPipeline } from '@leo-logs/trace';
import { startLogUi } from './ui';
import type { LogRow, LogSource } from './sqlite';

const source: LogSource = {
  catalog: async () => ({
    configured: true,
    message: null,
    table: 'blueprint-8675309.openrouter.openrouter_traces',
    overviews: [],
    agentOverviews: [],
    pipelines: [],
    agents: [],
    models: [],
  }),
  rows: async () => [],
};

describe('log ui', () => {
  it('serves the page, an empty catalog, and rejects a bad trace', async () => {
    const ui = await startLogUi({ port: 0, env: {}, source });
    try {
      const page = await fetch(ui.url);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /Pipelines/);
      assert.match(html, /Past hour/);
      assert.match(html, /Failures only/);
      assert.match(html, /Export CSV/);
      assert.match(html, /id="columns-button"/);
      assert.match(html, /leo-logs-columns:/);
      assert.match(html, /All models/);
      assert.match(html, /'Avg latency', 'Avg model time', 'Avg cost', 'P50 cost', 'P75 cost', 'P90 cost', 'P95 cost'/);
      assert.match(html, /const defaultHiddenLabels = \['P50 cost', 'P75 cost', 'P90 cost', 'P95 cost'\]/);
      assert.match(html, /const defaultHiddenPairs = \[\['Avg latency', 'Avg model time'\], \['Latency', 'Model time'\]\]/);
      assert.match(html, /'Calls', 'Latency', 'Model time', 'Cost'/);
      assert.match(html, /'Status', 'Turn', 'Latency'/);
      assert.match(html, /'Input', 'Output', 'Messages', 'Cost', 'Model', 'Provider', 'Functions', 'Server'/);
      assert.match(html, /Function result/);
      assert.match(html, /Function call/);
      assert.match(html, /Chat result/);
      assert.match(html, /aria-sort/);
      assert.match(html, /https:\/\/openrouter.ai\/provider\//);
      assert.match(html, /id="messages-panel"/);
      assert.match(html, /id="call-panel"/);
      assert.doesNotMatch(html, /<dialog/);
      assert.match(html, /id="agents-panel"/);
      assert.match(html, /openAgents\(item\.name\)/);
      assert.match(html, /https:\/\/openrouter.ai\/docs\/guides\/features\/server-tools\//);
      assert.match(html, /'openrouter:datetime': 'datetime'/);
      assert.match(html, /id="stats"/);
      assert.match(html, /label: 'Sessions'/);
      assert.match(html, /JSON.stringify\(pretty\(/);
      const sessions = await fetch(`${ui.url}/sessions?pipeline=order-desk`);
      assert.equal(sessions.status, 200);
      assert.match(await sessions.text(), /path === '\/sessions'/);
      const session = await fetch(`${ui.url}/session?pipeline=order-desk&session=${encodeURIComponent('pipeline:order-desk-execution:11111111-1111-4111-8111-111111111111')}`);
      assert.equal(session.status, 200);
      const sessionHtml = await session.text();
      assert.match(sessionHtml, /path === '\/session'/);
      assert.match(sessionHtml, /params.set\('session'/);
      const legacy = await fetch(`${ui.url}/?pipeline=order-desk&session=${encodeURIComponent('pipeline:order-desk-execution:11111111-1111-4111-8111-111111111111')}`);
      assert.equal(legacy.status, 200);
      assert.doesNotMatch(await (await fetch(ui.url)).text(), /params\.set\('view'/);
      const agents = await fetch(`${ui.url}/agents`);
      assert.equal(agents.status, 200);
      assert.match(await agents.text(), /path === '\/agents'/);
      const executions = await fetch(`${ui.url}/executions?agent=lookup&pipeline=order-desk`);
      assert.equal(executions.status, 200);
      assert.match(await executions.text(), /path === '\/executions'/);
      const execution = await fetch(`${ui.url}/execution?agent=lookup&pipeline=order-desk&execution=${encodeURIComponent('order-desk_agent:lookup-execution:11111111-1111-4111-8111-111111111111')}`);
      assert.equal(execution.status, 200);
      const executionHtml = await execution.text();
      assert.match(executionHtml, /path === '\/execution'/);
      assert.match(executionHtml, /params.set\('execution'/);
      const legacyAgent = await fetch(`${ui.url}/agents?agent=lookup&pipeline=order-desk`);
      assert.equal(legacyAgent.status, 200);
      const path = await fetch(`${ui.url}/pipelines/order-desk`);
      assert.equal(path.status, 404);
      const catalog = await fetch(`${ui.url}/api/catalog`);
      const body = await catalog.json() as { configured: boolean; table: string };
      assert.equal(body.configured, true);
      assert.equal(body.table, 'blueprint-8675309.openrouter.openrouter_traces');
      const rows = await fetch(`${ui.url}/api/rows?scope=agent&traceId=nope`);
      assert.equal(rows.status, 400);
    } finally {
      await ui.close();
    }
  });

  it('returns rows for an agent trace id', async () => {
    const agent = createAgent('solo');
    const rowsSource: LogSource = {
      catalog: source.catalog,
      rows: async (scope, traceId) => {
        assert.equal(scope, 'agent');
        assert.equal(traceId, agent.traceId());
        const row: LogRow = {
          traceId,
          spanId: 'span',
          parentSpanId: null,
          userId: null,
          sessionId: null,
          timestamp: '2026-10-29T12:00:00Z',
          durationMs: 12,
          model: 'openai/gpt-5.5',
          providerName: 'OpenAI',
          status: 'ok',
          level: 'DEFAULT',
          finishReason: 'stop',
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          totalCost: 0.01,
          apiKeyName: 'prod',
          input: 'hello',
          output: 'hi',
          metadata: null,
        };
        return [row];
      },
    };
    const ui = await startLogUi({ port: 0, env: {}, source: rowsSource });
    try {
      const response = await fetch(`${ui.url}/api/rows?scope=agent&traceId=${encodeURIComponent(agent.traceId())}`);
      assert.equal(response.status, 200);
      const body = await response.json() as { rows: Array<{ executionId: string; agentName: string }> };
      assert.equal(body.rows[0]?.executionId, agent.id);
      assert.equal(body.rows[0]?.agentName, 'solo');
    } finally {
      await ui.close();
    }
  });

  it('names a generation from the preceding agent in the session', async () => {
    const pipeline = createPipeline('order-desk');
    const lookup = createAgent('lookup', pipeline);
    const policy = createAgent('policy', pipeline);
    const row = (traceId: string, timestamp: string): LogRow => ({
      traceId,
      spanId: 'span',
      parentSpanId: null,
      userId: null,
      sessionId: pipeline.sessionId(),
      timestamp,
      durationMs: 12,
      model: 'z-ai/glm-5.3-flash',
      providerName: 'Z.AI',
      status: 'ok',
      level: 'DEFAULT',
      finishReason: 'stop',
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      totalCost: 0.01,
      apiKeyName: 'prod',
      input: null,
      output: null,
      metadata: null,
    });
    const rowsSource: LogSource = {
      catalog: source.catalog,
      rows: async () => [
        row('gen-early', '2026-10-30T16:12:10Z'),
        row(lookup.traceId(), '2026-10-30T16:12:14Z'),
        row('gen-datetime', '2026-10-30T16:12:17Z'),
        row(pipeline.sessionId(), '2026-10-30T16:12:18Z'),
        row(policy.traceId(), '2026-10-30T16:12:19Z'),
        row('gen-search', '2026-10-30T16:12:21Z'),
      ],
    };
    const ui = await startLogUi({ port: 0, env: {}, source: rowsSource });
    try {
      const response = await fetch(`${ui.url}/api/rows?scope=pipeline&traceId=${encodeURIComponent(pipeline.sessionId())}`);
      assert.equal(response.status, 200);
      const body = await response.json() as { rows: Array<{ traceId: string; agentName: string | null }> };
      const names = Object.fromEntries(body.rows.map((item) => [item.traceId, item.agentName]));
      assert.equal(names['gen-early'], null);
      assert.equal(names[lookup.traceId()], 'lookup');
      assert.equal(names['gen-datetime'], 'lookup');
      assert.equal(names[pipeline.sessionId()], null);
      assert.equal(names[policy.traceId()], 'policy');
      assert.equal(names['gen-search'], 'policy');
    } finally {
      await ui.close();
    }
  });

  it('reads an empty sqlite log and stores a posted trace', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'leo-logs-'));
    const file = join(dir, 'logs.db');
    const ui = await startLogUi({ port: 0, env: { LEO_LOGS_DB: file, LEO_LOGS_TOKEN: 'secret' } });
    try {
      const setup = await fetch(`${ui.url}/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password1' }),
      });
      assert.equal(setup.status, 200);
      const cookie = (setup.headers.get('set-cookie') ?? '').split(';')[0];
      const ready = await fetch(`${ui.url}/ready`, { method: 'POST', headers: { cookie } });
      assert.equal(ready.status, 200);
      const empty = await fetch(`${ui.url}/api/catalog`, { headers: { cookie } });
      const catalog = await empty.json() as { configured: boolean; message: string | null; table: string; pipelines: unknown[] };
      assert.equal(catalog.configured, true);
      assert.equal(catalog.message, null);
      assert.equal(catalog.table, file);
      assert.deepEqual(catalog.pipelines, []);
      const denied = await fetch(`${ui.url}/traces`, { method: 'POST', body: '{}' });
      assert.equal(denied.status, 401);
      const test = await fetch(`${ui.url}/traces`, { method: 'POST', headers: { authorization: 'Bearer secret', 'x-test-connection': 'true' } });
      assert.equal(test.status, 200);
      const pipeline = createPipeline('order-desk');
      const start = BigInt(Date.parse('2026-10-30T18:00:00.000Z')) * 1_000_000n;
      const posted = await fetch(`${ui.url}/traces`, {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify({
          resourceSpans: [{
            scopeSpans: [{
              spans: [{
                traceId: pipeline.sessionId(),
                spanId: 'generation',
                startTimeUnixNano: String(start),
                endTimeUnixNano: String(start + 15_000_000n),
                attributes: [
                  { key: 'gen_ai.request.model', value: { stringValue: 'openai/gpt-5.5' } },
                  { key: 'gen_ai.usage.input_tokens', value: { intValue: '4' } },
                  { key: 'gen_ai.usage.output_tokens', value: { intValue: '6' } },
                  { key: 'gen_ai.usage.total_cost', value: { doubleValue: 0.3 } },
                ],
              }],
            }],
          }],
        }),
      });
      assert.equal(posted.status, 200);
      const filled = await fetch(`${ui.url}/api/catalog`, { headers: { cookie } });
      const body = await filled.json() as { pipelines: Array<{ name: string; calls: number; cost: number }> };
      assert.equal(body.pipelines[0]?.name, 'order-desk');
      assert.equal(body.pipelines[0]?.calls, 1);
      assert.equal(body.pipelines[0]?.cost, 0.3);
    } finally {
      await ui.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('shows setup on a new log file, then requires that login', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'leo-logs-'));
    const ui = await startLogUi({ port: 0, env: { LEO_LOGS_DB: join(dir, 'logs.db') } });
    try {
      const first = await fetch(`${ui.url}/`);
      assert.equal(first.status, 200);
      assert.match(await first.text(), /Create the login/);
      const locked = await fetch(`${ui.url}/api/catalog`);
      assert.equal(locked.status, 401);
      const short = await fetch(`${ui.url}/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'short' }),
      });
      assert.equal(short.status, 400);
      const created = await fetch(`${ui.url}/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password1' }),
      });
      assert.equal(created.status, 200);
      const again = await fetch(`${ui.url}/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password1' }),
      });
      assert.equal(again.status, 409);
      const wrong = await fetch(`${ui.url}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password2' }),
      });
      assert.equal(wrong.status, 401);
      const login = await fetch(`${ui.url}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password1' }),
      });
      assert.equal(login.status, 200);
      const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
      const page = await fetch(`${ui.url}/`, { headers: { cookie } });
      const html = await page.text();
      assert.match(html, /Connect OpenRouter/);
      assert.match(html, /\/traces/);
      const token = /data-token="([^"]+)"/.exec(html)?.[1] ?? '';
      assert.equal(token.length, 64);
      const posted = await fetch(`${ui.url}/traces`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'x-test-connection': 'true' },
      });
      assert.equal(posted.status, 200);
      const ready = await fetch(`${ui.url}/ready`, { method: 'POST', headers: { cookie } });
      assert.equal(ready.status, 200);
      const logs = await fetch(`${ui.url}/`, { headers: { cookie } });
      const logsHtml = await logs.text();
      assert.match(logsHtml, /Pipelines/);
      assert.match(logsHtml, /id="nav-settings"/);
      const settingsPage = await fetch(`${ui.url}/settings`, { headers: { cookie } });
      assert.equal(settingsPage.status, 200);
      const settings = await fetch(`${ui.url}/api/settings`, { headers: { cookie } });
      assert.equal(settings.status, 200);
      const saved = await settings.json() as { username: string; token: string; tracesUrl: string; canChangePassword: boolean };
      assert.equal(saved.username, 'mina');
      assert.equal(saved.token, token);
      assert.match(saved.tracesUrl, /\/traces$/);
      assert.equal(saved.canChangePassword, true);
      const changed = await fetch(`${ui.url}/api/password`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ current: 'password1', password: 'password2' }),
      });
      assert.equal(changed.status, 200);
      const rejected = await fetch(`${ui.url}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'mina', password: 'password1' }),
      });
      assert.equal(rejected.status, 401);
    } finally {
      await ui.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('asks for the page login and still accepts the webhook token', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'leo-logs-'));
    const ui = await startLogUi({
      port: 0,
      env: { LEO_LOGS_DB: join(dir, 'logs.db'), LEO_LOGS_USER: 'mina', LEO_LOGS_PASSWORD: 'secret', LEO_LOGS_TOKEN: 'hook' },
    });
    try {
      const locked = await fetch(`${ui.url}/`);
      assert.equal(locked.status, 401);
      assert.match(locked.headers.get('www-authenticate') ?? '', /Basic/);
      const catalog = await fetch(`${ui.url}/api/catalog`);
      assert.equal(catalog.status, 401);
      const page = await fetch(`${ui.url}/`, { headers: { authorization: `Basic ${Buffer.from('mina:secret').toString('base64')}` } });
      assert.equal(page.status, 200);
      const posted = await fetch(`${ui.url}/traces`, {
        method: 'POST',
        headers: { authorization: 'Bearer hook', 'x-test-connection': 'true' },
      });
      assert.equal(posted.status, 200);
      await assert.rejects(() => startLogUi({ port: 0, env: { LEO_LOGS_USER: 'mina' }, source }), /LEO_LOGS_USER/);
    } finally {
      await ui.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes the time window and model, and rejects a bad model', async () => {
    let seen: TraceQuery | undefined;
    const filtered: LogSource = {
      catalog: async (query) => {
        seen = query;
        return source.catalog();
      },
      rows: async () => [],
    };
    const ui = await startLogUi({ port: 0, env: {}, source: filtered });
    try {
      const response = await fetch(`${ui.url}/api/catalog?window=hour&model=openai/gpt-5.5`);
      assert.equal(response.status, 200);
      assert.equal(seen?.window, 'hour');
      assert.equal(seen?.hours, 1);
      assert.deepEqual(seen?.models, ['openai/gpt-5.5']);
      const both = await fetch(`${ui.url}/api/catalog?model=z-ai/glm-5.3&model=z-ai/glm-5.3-flash`);
      assert.equal(both.status, 200);
      assert.deepEqual(seen?.models, ['z-ai/glm-5.3', 'z-ai/glm-5.3-flash']);
      const bad = await fetch(`${ui.url}/api/catalog?model=${encodeURIComponent('gpt 5')}`);
      assert.equal(bad.status, 400);
    } finally {
      await ui.close();
    }
  });

  it('serves provider slugs', async () => {
    const ui = await startLogUi({
      port: 0,
      env: {},
      source,
      providers: async () => ({ 'Z.AI': 'z-ai' }),
    });
    try {
      const providers = await fetch(`${ui.url}/api/providers`);
      assert.equal(providers.status, 200);
      const pages = await providers.json() as { providers: Record<string, string> };
      assert.equal(pages.providers['Z.AI'], 'z-ai');
    } finally {
      await ui.close();
    }
  });
});
