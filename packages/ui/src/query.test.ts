import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { traceQuery } from './query';

describe('trace windows', () => {
  it('maps the page windows and rejects a model name that cannot be a parameter', () => {
    assert.equal(traceQuery({}).window, 'month');
    assert.equal(traceQuery({ window: 'hour' }).hours, 1);
    assert.equal(traceQuery({ window: 'day' }).hours, 24);
    assert.equal(traceQuery({ window: 'week' }).hours, 168);
    assert.equal(traceQuery({ window: 'month' }).hours, 720);
    assert.deepEqual(traceQuery({}).models, []);
    assert.deepEqual(traceQuery({ model: ' openai/gpt-5.5 ' }).models, ['openai/gpt-5.5']);
    assert.deepEqual(traceQuery({ model: ['z-ai/glm-5.3', ' z-ai/glm-5.3-flash ', 'z-ai/glm-5.3', ''] }).models, ['z-ai/glm-5.3', 'z-ai/glm-5.3-flash']);
    assert.throws(() => traceQuery({ model: 'gpt 5' }), /model/);
  });
});
