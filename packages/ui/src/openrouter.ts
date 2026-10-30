const SLUG = /^[a-z0-9-]+$/;

/** Maps an OpenRouter provider display name to the slug used in its page URL. */
export const providerSlugs = (body: unknown): Record<string, string> => {
  const data = body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
    ? (body as { data: unknown[] }).data
    : [];
  const map: Record<string, string> = {};
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const name = (item as { name?: unknown }).name;
    const slug = (item as { slug?: unknown }).slug;
    if (typeof name !== 'string' || !name.trim() || typeof slug !== 'string' || !SLUG.test(slug)) continue;
    map[name] = slug;
  }
  return map;
};

/** Provider pages are https://openrouter.ai/provider/{slug}. */
export const openRouterProviders = async (): Promise<Record<string, string>> => {
  const response = await fetch('https://openrouter.ai/api/v1/providers');
  if (!response.ok) throw new Error('Could not load OpenRouter providers');
  return providerSlugs(await response.json());
};
