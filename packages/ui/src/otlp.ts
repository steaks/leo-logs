import { parseTraceId } from '@leo-logs/trace';
import type { LogSpan } from './sqlite';

const attrValue = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.stringValue === 'string') return record.stringValue;
  if (typeof record.boolValue === 'boolean') return record.boolValue;
  if (typeof record.intValue === 'string' || typeof record.intValue === 'number') {
    const parsed = Number(record.intValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof record.doubleValue === 'number' || typeof record.doubleValue === 'string') {
    const parsed = Number(record.doubleValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const array = record.arrayValue;
  if (array && typeof array === 'object' && Array.isArray((array as { values?: unknown }).values)) {
    return (array as { values: unknown[] }).values.map(attrValue);
  }
  return null;
};

const attributesOf = (span: Record<string, unknown>): Map<string, unknown> => {
  const map = new Map<string, unknown>();
  const attributes = Array.isArray(span.attributes) ? span.attributes : [];
  for (const attribute of attributes) {
    if (!attribute || typeof attribute !== 'object') continue;
    const key = (attribute as { key?: unknown }).key;
    if (typeof key !== 'string' || !key) continue;
    map.set(key, attrValue((attribute as { value?: unknown }).value));
  }
  return map;
};

const text = (attrs: Map<string, unknown>, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = attrs.get(key);
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const amount = (attrs: Map<string, unknown>, ...keys: string[]): number => {
  for (const key of keys) {
    const value = attrs.get(key);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
};

const unixMs = (value: unknown): number | null => {
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(BigInt(value) / 1_000_000n);
  if (typeof value === 'number' && Number.isFinite(value) && value > 1e15) return Math.round(value / 1e6);
  return null;
};

const finishReason = (attrs: Map<string, unknown>): string | null => {
  const value = attrs.get('gen_ai.response.finish_reasons') ?? attrs.get('gen_ai.response.finish_reason');
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim());
    return typeof first === 'string' ? first : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

/** The page reads `input` and `output` as `{ messages: [...] }`. */
const messagesOf = (value: unknown, role: string): unknown => {
  if (value == null) return null;
  let data: unknown = value;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return null;
    try {
      data = JSON.parse(trimmed) as unknown;
    } catch {
      return { messages: [{ role, content: value }] };
    }
  }
  if (Array.isArray(data)) return { messages: data };
  if (data && typeof data === 'object' && Array.isArray((data as { messages?: unknown }).messages)) return data;
  if (data && typeof data === 'object') return { messages: [data] };
  return { messages: [{ role, content: String(data) }] };
};

const traceIdOf = (spanTraceId: string, attrs: Map<string, unknown>): string => {
  const candidates = [spanTraceId, text(attrs, 'trace.metadata.trace_id', 'trace.metadata.traceId')].filter((id): id is string => Boolean(id));
  return candidates.find((id) => parseTraceId(id)) ?? spanTraceId;
};

const hasUsage = (attrs: Map<string, unknown>): boolean =>
  ['gen_ai.usage.input_tokens', 'gen_ai.usage.prompt_tokens', 'gen_ai.usage.output_tokens', 'gen_ai.usage.completion_tokens', 'gen_ai.prompt', 'gen_ai.completion', 'gen_ai.input.messages', 'gen_ai.output.messages']
    .some((key) => attrs.has(key));

const isGeneration = (attrs: Map<string, unknown>): boolean =>
  hasUsage(attrs) || attrs.has('gen_ai.request.model');

const statusOf = (span: Record<string, unknown>): string => {
  const status = span.status;
  const code = status && typeof status === 'object' ? (status as { code?: unknown }).code : null;
  return code === 2 || code === 'STATUS_CODE_ERROR' ? 'error' : 'ok';
};

const spanOf = (span: Record<string, unknown>): LogSpan | null => {
  const rawId = typeof span.traceId === 'string' ? span.traceId : '';
  const spanId = typeof span.spanId === 'string' ? span.spanId : '';
  if (!rawId || !spanId) return null;
  const attrs = attributesOf(span);
  const started = unixMs(span.startTimeUnixNano);
  const ended = unixMs(span.endTimeUnixNano);
  const promptTokens = amount(attrs, 'gen_ai.usage.input_tokens', 'gen_ai.usage.prompt_tokens');
  const completionTokens = amount(attrs, 'gen_ai.usage.output_tokens', 'gen_ai.usage.completion_tokens');
  const input = messagesOf(attrs.get('gen_ai.input.messages') ?? attrs.get('gen_ai.prompt') ?? attrs.get('span.input'), 'user');
  const output = messagesOf(attrs.get('gen_ai.output.messages') ?? attrs.get('gen_ai.completion') ?? attrs.get('span.output'), 'assistant');
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of attrs) {
    if (key === 'gen_ai.prompt' || key === 'gen_ai.completion' || key === 'gen_ai.input.messages' || key === 'gen_ai.output.messages' || key === 'span.input' || key === 'span.output') continue;
    metadata[key] = value;
  }
  return {
    traceId: traceIdOf(rawId, attrs),
    spanId,
    parentSpanId: typeof span.parentSpanId === 'string' && span.parentSpanId ? span.parentSpanId : null,
    userId: text(attrs, 'user.id'),
    sessionId: text(attrs, 'session.id'),
    timestamp: started == null ? null : new Date(started).toISOString(),
    durationMs: started == null || ended == null || ended < started ? null : ended - started,
    model: text(attrs, 'gen_ai.request.model', 'gen_ai.response.model'),
    providerName: text(attrs, 'gen_ai.provider.name', 'gen_ai.system'),
    status: statusOf(span),
    level: null,
    finishReason: finishReason(attrs),
    promptTokens,
    completionTokens,
    cachedTokens: amount(attrs, 'gen_ai.usage.cache_read.input_tokens', 'gen_ai.usage.input_tokens.cached'),
    totalTokens: amount(attrs, 'gen_ai.usage.total_tokens') || promptTokens + completionTokens,
    totalCost: amount(attrs, 'gen_ai.usage.cost', 'gen_ai.usage.total_cost'),
    apiKeyName: text(attrs, 'trace.metadata.openrouter.api_key_name'),
    input,
    output,
    metadata,
  };
};

const spansIn = (body: unknown): Record<string, unknown>[] => {
  if (!body || typeof body !== 'object') return [];
  const resourceSpans = (body as { resourceSpans?: unknown }).resourceSpans;
  if (!Array.isArray(resourceSpans)) return [];
  const spans: Record<string, unknown>[] = [];
  for (const resource of resourceSpans) {
    const scopeSpans = resource && typeof resource === 'object' ? (resource as { scopeSpans?: unknown }).scopeSpans : null;
    if (!Array.isArray(scopeSpans)) continue;
    for (const scope of scopeSpans) {
      const list = scope && typeof scope === 'object' ? (scope as { spans?: unknown }).spans : null;
      if (!Array.isArray(list)) continue;
      for (const span of list) {
        if (span && typeof span === 'object') spans.push(span as Record<string, unknown>);
      }
    }
  }
  return spans;
};

/** Generation spans from one OpenRouter webhook body. A parent that only repeats the model is left out when a child has the usage. */
export const spansFromOtlp = (body: unknown): LogSpan[] => {
  const parsed = spansIn(body).map((span) => ({ span, attrs: attributesOf(span), row: spanOf(span) })).filter((item): item is { span: Record<string, unknown>; attrs: Map<string, unknown>; row: LogSpan } => item.row != null);
  const generations = parsed.filter((item) => isGeneration(item.attrs));
  const chosen = generations.some((item) => hasUsage(item.attrs)) ? generations.filter((item) => hasUsage(item.attrs)) : generations;
  return chosen.map((item) => item.row);
};
