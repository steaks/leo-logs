import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { providerSlugs } from './openrouter';

describe('OpenRouter pages', () => {
  it('maps provider names to page slugs', () => {
    const slugs = providerSlugs({
      data: [
        { name: 'OpenAI', slug: 'openai' },
        { name: 'Z.AI', slug: 'z-ai' },
        { name: 'Google', slug: 'google-vertex' },
        { name: 'Broken', slug: 'Not A Slug' },
      ],
    });
    assert.deepEqual(slugs, { OpenAI: 'openai', 'Z.AI': 'z-ai', Google: 'google-vertex' });
  });
});
