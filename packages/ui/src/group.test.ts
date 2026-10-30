import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAgent, createPipeline } from '@leo-logs/trace';
import { agentOverviews, groupTraces, percentile, pipelineOverviews } from './group';

describe('trace groups', () => {
  it('groups pipeline calls and standalone agents', () => {
    const pipeline = createPipeline('newsroom');
    const brief = createAgent('brief', pipeline);
    const solo = createAgent('solo');
    const grouped = groupTraces([
      { traceId: brief.traceId(), calls: 2, tokens: 20, cost: 0.2, durationMs: 50, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T12:00:00Z' },
      { traceId: pipeline.sessionId(), calls: 1, tokens: 5, cost: 0.1, durationMs: 100, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T11:00:00Z' },
      { traceId: solo.traceId(), calls: 4, tokens: 8, cost: 0.4, durationMs: 40, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T10:00:00Z' },
      { traceId: 'not-a-trace', calls: 9, tokens: 9, cost: 9, durationMs: 1, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T13:00:00Z' },
    ]);
    assert.equal(grouped.pipelines.length, 1);
    assert.equal(grouped.pipelines[0]?.calls, 3);
    assert.equal(grouped.pipelines[0]?.tokens, 25);
    assert.equal(grouped.pipelines[0]?.agents[0]?.name, 'brief');
    assert.equal(grouped.agents[0]?.name, 'solo');
    assert.equal(grouped.agents[0]?.calls, 4);
  });

  it('adds a server-tool generation to its pipeline session', () => {
    const pipeline = createPipeline('order-desk');
    const reply = createAgent('reply', pipeline);
    const grouped = groupTraces([
      { traceId: reply.traceId(), calls: 2, tokens: 10, cost: 0.01, durationMs: 100, durationSamples: 2, failures: 0, apiKeyNames: ['prod'], models: ['z-ai/glm-5.3'], latest: '2026-10-30T17:36:24Z' },
      { traceId: 'gen-1793381755-nh0RWIwY4q0NzecN2Cd6', sessionId: pipeline.sessionId(), calls: 6, tokens: 40, cost: 0.02, durationMs: 200, durationSamples: 6, failures: 0, apiKeyNames: ['prod'], models: ['z-ai/glm-5.3-flash'], latest: '2026-10-30T17:36:10Z' },
      { traceId: 'gen-orphan', calls: 3, tokens: 3, cost: 1, durationMs: 1, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-30T17:36:11Z' },
    ]);
    const session = grouped.pipelines[0];
    assert.equal(session?.calls, 8);
    assert.equal(session?.cost, 0.03);
    assert.equal(session?.tokens, 50);
    assert.deepEqual(session?.models, ['z-ai/glm-5.3', 'z-ai/glm-5.3-flash']);
    assert.equal(session?.agents.length, 1);
    assert.equal(session?.agents[0]?.calls, 2);
  });

  it('averages latency and cost across executions of one pipeline', () => {
    const first = createPipeline('newsroom');
    const second = createPipeline('newsroom');
    const other = createPipeline('desk');
    const grouped = groupTraces([
      { traceId: first.sessionId(), calls: 1, tokens: 1, cost: 0.3, durationMs: 100, durationSamples: 2, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T12:00:00Z' },
      { traceId: second.sessionId(), calls: 1, tokens: 1, cost: 0.1, durationMs: 50, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T13:00:00Z' },
      { traceId: other.sessionId(), calls: 1, tokens: 1, cost: 1, durationMs: 10, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T09:00:00Z' },
    ]);
    const [newsroom, desk] = pipelineOverviews(grouped.pipelines);
    assert.equal(newsroom?.name, 'newsroom');
    assert.equal(newsroom?.executions, 2);
    assert.equal(newsroom?.averageCost, 0.2);
    assert.equal(newsroom?.averageModelTimeMs, 75);
    assert.equal(newsroom?.averageLatencyMs, null);
    assert.equal(desk?.name, 'desk');
    assert.equal(desk?.executions, 1);
    assert.equal(desk?.averageCost, 1);
    assert.equal(desk?.averageModelTimeMs, 10);
    assert.equal(desk?.averageLatencyMs, null);
    assert.equal(newsroom?.totalTokens, 2);
    assert.equal(newsroom?.totalCost, 0.4);
    assert.equal(newsroom?.agents, 0);
    assert.equal(newsroom?.failures, 0);
    assert.equal(newsroom?.costP50, 0.2);
    assert.equal(desk?.costP50, 1);
    assert.equal(desk?.costP95, 1);
  });

  it('reports session cost percentiles', () => {
    const costs = [10, 40, 20, 30].map((cost, index) => {
      const pipeline = createPipeline('newsroom');
      return { traceId: pipeline.sessionId(), calls: 1, tokens: 1, cost, durationMs: 0, durationSamples: 0, failures: 0, apiKeyNames: [], models: [], latest: `2026-10-29T12:00:0${index}Z` };
    });
    const overview = pipelineOverviews(groupTraces(costs).pipelines)[0];
    const near = (actual: number | undefined, expected: number) => assert.ok(Math.abs((actual ?? NaN) - expected) < 1e-9, `${actual} is not near ${expected}`);
    near(overview?.costP50, 25);
    near(overview?.costP75, 32.5);
    near(overview?.costP90, percentile([10, 20, 30, 40], 90));
    near(overview?.costP95, percentile([10, 20, 30, 40], 95));
    assert.equal(percentile([], 50), 0);
    assert.equal(percentile([7], 95), 7);
  });

  it('measures latency from the first call start to the last call end', () => {
    const pipeline = createPipeline('newsroom');
    const brief = createAgent('brief', pipeline);
    const grouped = groupTraces([
      { traceId: pipeline.sessionId(), calls: 1, tokens: 1, cost: 0.1, durationMs: 1000, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T12:00:01.000Z', started: '2026-10-29T12:00:00.000Z', ended: '2026-10-29T12:00:01.000Z' },
      { traceId: brief.traceId(), calls: 1, tokens: 1, cost: 0.2, durationMs: 2500, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T12:00:03.000Z', started: '2026-10-29T12:00:00.500Z', ended: '2026-10-29T12:00:03.000Z' },
    ]);
    const session = grouped.pipelines[0];
    assert.equal(session?.started, '2026-10-29T12:00:00.000Z');
    assert.equal(session?.ended, '2026-10-29T12:00:03.000Z');
    const overview = pipelineOverviews(grouped.pipelines)[0];
    assert.equal(overview?.averageLatencyMs, 3000);
    assert.equal(overview?.averageModelTimeMs, 3500);
  });

  it('totals cost, tokens, distinct agents, and failed calls', () => {
    const first = createPipeline('newsroom');
    const second = createPipeline('newsroom');
    const brief = createAgent('brief', first);
    const again = createAgent('brief', second);
    const editor = createAgent('editor', second);
    const grouped = groupTraces([
      { traceId: first.sessionId(), calls: 1, tokens: 10, promptTokens: 6, completionTokens: 4, cachedTokens: 2, cost: 4, durationMs: 0, durationSamples: 0, failures: 1, apiKeyNames: ['prod'], models: ['z-ai/glm-5.3'], latest: '2026-10-29T12:00:00Z' },
      { traceId: brief.traceId(), calls: 1, tokens: 5, promptTokens: 3, completionTokens: 2, cachedTokens: 1, cost: 1, durationMs: 0, durationSamples: 0, failures: 0, apiKeyNames: ['prod'], models: ['z-ai/glm-5.3'], latest: '2026-10-29T12:00:00Z' },
      { traceId: second.sessionId(), calls: 1, tokens: 20, cost: 2, durationMs: 0, durationSamples: 0, failures: 2, apiKeyNames: ['staging'], models: ['openai/gpt-5.5'], latest: '2026-10-29T13:00:00Z' },
      { traceId: again.traceId(), calls: 1, tokens: 3, cost: 1, durationMs: 0, durationSamples: 0, failures: 1, apiKeyNames: [], models: [], latest: '2026-10-29T13:00:00Z' },
      { traceId: editor.traceId(), calls: 1, tokens: 7, cost: 1, durationMs: 0, durationSamples: 0, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T13:00:00Z' },
    ]);
    const newsroom = pipelineOverviews(grouped.pipelines)[0];
    assert.equal(newsroom?.executions, 2);
    assert.equal(newsroom?.agents, 2);
    assert.equal(newsroom?.failures, 4);
    assert.equal(newsroom?.totalTokens, 45);
    assert.equal(newsroom?.inputTokens, 9);
    assert.equal(newsroom?.outputTokens, 6);
    assert.equal(newsroom?.cachedTokens, 3);
    assert.equal(newsroom?.totalCost, 9);
    assert.deepEqual(newsroom?.keyNames, ['prod', 'staging']);
  });

  it('averages an agent across its executions', () => {
    const pipeline = createPipeline('newsroom');
    const again = createPipeline('newsroom');
    const brief = createAgent('brief', pipeline);
    const repeat = createAgent('brief', again);
    const solo = createAgent('solo');
    const grouped = groupTraces([
      { traceId: brief.traceId(), calls: 1, tokens: 1, cost: 4, durationMs: 80, durationSamples: 1, failures: 1, apiKeyNames: ['prod'], models: ['z-ai/glm-5.3'], latest: '2026-10-29T12:00:00Z' },
      { traceId: repeat.traceId(), calls: 1, tokens: 1, cost: 2, durationMs: 40, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T13:00:00Z' },
      { traceId: solo.traceId(), calls: 1, tokens: 1, cost: 0.1, durationMs: 10, durationSamples: 1, failures: 0, apiKeyNames: [], models: [], latest: '2026-10-29T11:00:00Z' },
    ]);
    const overviews = agentOverviews(grouped.pipelines, grouped.agents);
    const briefRow = overviews.find((item) => item.name === 'brief');
    const soloRow = overviews.find((item) => item.name === 'solo');
    assert.equal(briefRow?.pipelineName, 'newsroom');
    assert.equal(briefRow?.executions, 2);
    assert.equal(briefRow?.averageCost, 3);
    assert.equal(briefRow?.averageLatencyMs, 60);
    assert.equal(briefRow?.failures, 1);
    assert.deepEqual(briefRow?.keyNames, ['prod']);
    assert.equal(soloRow?.pipelineName, null);
    assert.equal(soloRow?.executions, 1);
  });
});
