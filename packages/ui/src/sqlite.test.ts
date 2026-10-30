import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createAgent, createPipeline } from '@leo-logs/trace';
import { openLogs, type LogSpan } from './sqlite';

const span = (traceId: string, spanId: string, overrides: Partial<LogSpan> = {}): LogSpan => ({
  traceId,
  spanId,
  parentSpanId: null,
  userId: null,
  sessionId: null,
  timestamp: '2026-10-30T18:00:00.000Z',
  durationMs: 25,
  model: 'openai/gpt-5.5',
  providerName: 'openai',
  status: 'ok',
  level: null,
  finishReason: 'stop',
  promptTokens: 2,
  completionTokens: 3,
  cachedTokens: 1,
  totalTokens: 5,
  totalCost: 0.1,
  apiKeyName: 'prod',
  input: { messages: [{ role: 'user', content: 'hello' }] },
  output: { messages: [{ role: 'assistant', content: 'hi' }] },
  metadata: { kept: true },
  ...overrides,
});

describe('sqlite log', () => {
  it('groups a pipeline, filters a model, and drops rows older than 30 days', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'leo-logs-'));
    const logs = openLogs({ LEO_LOGS_DB: join(dir, 'logs.db') });
    try {
      const pipeline = createPipeline('my_pipeline');
      const agent = createAgent('lookup', pipeline);
      logs.insert([
        span(pipeline.sessionId(), 'root', { sessionId: pipeline.sessionId(), totalCost: 1 }),
        span(agent.traceId(), 'agent', { sessionId: pipeline.sessionId(), model: 'z-ai/glm-5.3', totalCost: 4, promptTokens: 4, completionTokens: 1, cachedTokens: 0, totalTokens: 5 }),
        span('gen-search', 'tool', { sessionId: pipeline.sessionId(), model: 'z-ai/glm-5.3', totalCost: 2, cachedTokens: 0 }),
        span(pipeline.sessionId(), 'old', { timestamp: '2020-01-01T00:00:00.000Z', totalCost: 9 }),
      ]);
      const catalog = await logs.source.catalog();
      assert.equal(catalog.configured, true);
      assert.equal(catalog.pipelines.length, 1);
      assert.equal(catalog.pipelines[0]?.name, 'my_pipeline');
      assert.equal(catalog.pipelines[0]?.calls, 3);
      assert.equal(catalog.pipelines[0]?.cost, 7);
      assert.equal(catalog.pipelines[0]?.cachedTokens, 1);
      assert.equal(catalog.pipelines[0]?.agents.length, 1);
      assert.deepEqual(catalog.models, ['openai/gpt-5.5', 'z-ai/glm-5.3']);
      const filtered = await logs.source.catalog({ window: 'month', hours: 720, models: ['z-ai/glm-5.3'] });
      assert.equal(filtered.pipelines[0]?.calls, 2);
      assert.deepEqual(filtered.models, ['openai/gpt-5.5', 'z-ai/glm-5.3']);
      const rows = await logs.source.rows('pipeline', pipeline.sessionId());
      assert.equal(rows.length, 3);
      assert.equal(rows.some((row) => row.spanId === 'old'), false);
      assert.deepEqual(rows.find((row) => row.spanId === 'root')?.input, { messages: [{ role: 'user', content: 'hello' }] });
      const agentRows = await logs.source.rows('agent', agent.traceId());
      assert.equal(agentRows.length, 1);
      assert.equal(agentRows[0]?.spanId, 'agent');
    } finally {
      logs.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stores the agent id OpenRouter left on the completion', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'leo-logs-'));
    const logs = openLogs({ LEO_LOGS_DB: join(dir, 'logs.db') });
    try {
      const pipeline = createPipeline('order-desk');
      const agent = createAgent('lookup', pipeline);
      logs.insert([
        span('a92bb4badcd55b9be82596e87eb3ad3d', 'call', {
          sessionId: pipeline.sessionId(),
          output: { messages: [{ rawRequest: { trace: { trace_id: agent.traceId() } } }] },
        }),
      ]);
      const catalog = await logs.source.catalog();
      assert.equal(catalog.pipelines[0]?.agents[0]?.name, 'lookup');
      assert.equal(catalog.pipelines[0]?.agents[0]?.traceId, agent.traceId());
      const agentRows = await logs.source.rows('agent', agent.traceId());
      assert.equal(agentRows.length, 1);
      assert.equal(agentRows[0]?.traceId, agent.traceId());
    } finally {
      logs.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
