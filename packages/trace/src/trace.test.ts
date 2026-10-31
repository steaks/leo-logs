import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAgent, createPipeline, parseTraceId } from './trace';

describe('trace ids', () => {
  it('keeps a pipeline id stable and parseable', () => {
    const pipeline = createPipeline('my-pipeline');
    assert.equal(pipeline.sessionId(), pipeline.sessionId());
    assert.equal(parseTraceId(pipeline.sessionId())?.kind, 'pipeline');
    assert.equal(parseTraceId(pipeline.sessionId())?.name, 'my-pipeline');
    assert.equal(parseTraceId(pipeline.sessionId())?.id, pipeline.id);
  });

  it('creates an agent from the pipeline', () => {
    const pipeline = createPipeline('my-pipeline');
    const agent = pipeline.agent('simple');
    assert.equal(agent.pipeline, pipeline);
    assert.equal(agent.traceId(), `${pipeline.sessionId()}_agent:simple-execution:${agent.id}`);
    assert.equal(agent.traceId(), agent.traceId());
    assert.equal(agent.sessionId(), pipeline.sessionId());
  });

  it('prefixes an agent with its pipeline', () => {
    const pipeline = createPipeline('my-pipeline');
    const agent = createAgent('simple', pipeline);
    assert.equal(agent.traceId(), `${pipeline.sessionId()}_agent:simple-execution:${agent.id}`);
    const parsed = parseTraceId(agent.traceId());
    assert.equal(parsed?.kind, 'agent');
    if (parsed?.kind !== 'agent') return;
    assert.equal(parsed.pipeline?.traceId, pipeline.sessionId());
    assert.equal(parsed.name, 'simple');
  });

  it('leaves an agent without a pipeline unprefixed', () => {
    const agent = createAgent('solo');
    assert.match(agent.traceId(), /^agent:solo-/);
    const parsed = parseTraceId(agent.traceId());
    assert.equal(parsed?.kind, 'agent');
    if (parsed?.kind !== 'agent') return;
    assert.equal(parsed.pipeline, null);
    assert.equal(agent.sessionId(), null);
  });

  it('rejects an empty name and the agent separator', () => {
    assert.throws(() => createPipeline('  '), /Pipeline name is empty/);
    assert.throws(() => createAgent('desk_agent:one'), /cannot contain _agent:/);
  });
});
