"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterProviders = exports.providerSlugs = void 0;
const SLUG = /^[a-z0-9-]+$/;
/** Maps an OpenRouter provider display name to the slug used in its page URL. */
const providerSlugs = (body) => {
    const data = body && typeof body === 'object' && Array.isArray(body.data)
        ? body.data
        : [];
    const map = {};
    for (const item of data) {
        if (!item || typeof item !== 'object')
            continue;
        const name = item.name;
        const slug = item.slug;
        if (typeof name !== 'string' || !name.trim() || typeof slug !== 'string' || !SLUG.test(slug))
            continue;
        map[name] = slug;
    }
    return map;
};
exports.providerSlugs = providerSlugs;
/** Provider pages are https://openrouter.ai/provider/{slug}. */
const openRouterProviders = async () => {
    const response = await fetch('https://openrouter.ai/api/v1/providers');
    if (!response.ok)
        throw new Error('Could not load OpenRouter providers');
    return (0, exports.providerSlugs)(await response.json());
};
exports.openRouterProviders = openRouterProviders;
//# sourceMappingURL=openrouter.js.map