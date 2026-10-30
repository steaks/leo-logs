import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAgent, createPipeline } from '@leo-logs/trace';
import { spansFromOtlp } from './otlp';

const nano = (ms: number) => String(BigInt(ms) * 1_000_000n);

describe('otlp webhook', () => {
  it('keeps the generation span and the pipeline trace id', () => {
    const pipeline = createPipeline('order-desk');
    const start = Date.parse('2026-10-30T18:00:00.000Z');
    const spans = spansFromOtlp({
      resourceSpans: [{
        scopeSpans: [{
          spans: [
            {
              traceId: 'parent-span',
              spanId: 'parent',
              startTimeUnixNano: nano(start),
              endTimeUnixNano: nano(start + 10),
              attributes: [{ key: 'gen_ai.request.model', value: { stringValue: 'openai/gpt-5.5' } }],
            },
            {
              traceId: 'abc123',
              spanId: 'generation',
              parentSpanId: 'parent',
              startTimeUnixNano: nano(start),
              endTimeUnixNano: nano(start + 40),
              status: { code: 2 },
              attributes: [
                { key: 'gen_ai.request.model', value: { stringValue: 'openai/gpt-5.5' } },
                { key: 'gen_ai.provider.name', value: { stringValue: 'openai' } },
                { key: 'gen_ai.usage.input_tokens', value: { intValue: '11' } },
                { key: 'gen_ai.usage.output_tokens', value: { intValue: '7' } },
                { key: 'gen_ai.usage.cache_read.input_tokens', value: { intValue: '3' } },
                { key: 'gen_ai.usage.total_cost', value: { doubleValue: 0.02 } },
                { key: 'gen_ai.response.finish_reasons', value: { arrayValue: { values: [{ stringValue: 'stop' }] } } },
                { key: 'session.id', value: { stringValue: pipeline.sessionId() } },
                { key: 'user.id', value: { stringValue: 'mina' } },
                { key: 'trace.metadata.trace_id', value: { stringValue: pipeline.sessionId() } },
                { key: 'trace.metadata.openrouter.api_key_name', value: { stringValue: 'prod' } },
                { key: 'gen_ai.prompt', value: { stringValue: JSON.stringify([{ role: 'user', content: 'hello' }]) } },
                { key: 'gen_ai.completion', value: { stringValue: JSON.stringify({ role: 'assistant', content: 'hi' }) } },
              ],
            },
          ],
        }],
      }],
    });
    assert.equal(spans.length, 1);
    const span = spans[0];
    assert.equal(span?.traceId, pipeline.sessionId());
    assert.equal(span?.spanId, 'generation');
    assert.equal(span?.parentSpanId, 'parent');
    assert.equal(span?.sessionId, pipeline.sessionId());
    assert.equal(span?.userId, 'mina');
    assert.equal(span?.model, 'openai/gpt-5.5');
    assert.equal(span?.providerName, 'openai');
    assert.equal(span?.status, 'error');
    assert.equal(span?.finishReason, 'stop');
    assert.equal(span?.promptTokens, 11);
    assert.equal(span?.completionTokens, 7);
    assert.equal(span?.cachedTokens, 3);
    assert.equal(span?.totalTokens, 18);
    assert.equal(span?.totalCost, 0.02);
    assert.equal(span?.apiKeyName, 'prod');
    assert.equal(span?.durationMs, 40);
    assert.equal(span?.timestamp, '2026-10-30T18:00:00.000Z');
    assert.deepEqual(span?.input, { messages: [{ role: 'user', content: 'hello' }] });
    assert.deepEqual(span?.output, { messages: [{ role: 'assistant', content: 'hi' }] });
  });

  it('uses the trace id OpenRouter left on the completion', () => {
    const pipeline = createPipeline('order-desk');
    const agent = createAgent('lookup', pipeline);
    const start = Date.parse('2026-10-30T18:00:00.000Z');
    const spans = spansFromOtlp({
      resourceSpans: [{
        scopeSpans: [{
          spans: [{
            traceId: 'a92bb4badcd55b9be82596e87eb3ad3d',
            spanId: 'generation',
            startTimeUnixNano: nano(start),
            endTimeUnixNano: nano(start + 40),
            attributes: [
              { key: 'gen_ai.request.model', value: { stringValue: 'z-ai/glm-5.3-flash' } },
              { key: 'gen_ai.usage.input_tokens', value: { intValue: '251' } },
              { key: 'gen_ai.usage.output_tokens', value: { intValue: '38' } },
              { key: 'session.id', value: { stringValue: pipeline.sessionId() } },
              {
                key: 'gen_ai.completion',
                value: {
                  stringValue: JSON.stringify({
                    messages: [{
                      rawRequest: { trace: { trace_id: agent.traceId() }, session_id: pipeline.sessionId() },
                    }],
                  }),
                },
              },
            ],
          }],
        }],
      }],
    });
    assert.equal(spans[0]?.traceId, agent.traceId());
    assert.equal(spans[0]?.sessionId, pipeline.sessionId());
  });

  it('returns nothing for an empty test payload', () => {
    assert.deepEqual(spansFromOtlp({ resourceSpans: [] }), []);
    assert.deepEqual(spansFromOtlp(null), []);
  });
});
