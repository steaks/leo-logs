export const TRACE_ROW_LIMIT = 200;

export type TraceWindow = 'hour' | 'day' | 'week' | 'month';

/** Hours behind the current time. The pipelines page defaults to the last 30 days. */
export const TRACE_WINDOWS: Record<TraceWindow, number> = {
  hour: 1,
  day: 24,
  week: 7 * 24,
  month: 30 * 24,
};

export interface TraceQuery {
  window: TraceWindow;
  hours: number;
  /** Empty means every model. */
  models: string[];
}

const MODEL = /^[A-Za-z0-9._:/@+-]{1,200}$/;
const MODEL_LIMIT = 50;

/** A missing window is the last 30 days. A missing model list means every model. */
export const traceQuery = (input: { window?: string | null; model?: string | string[] | null }): TraceQuery => {
  const window: TraceWindow = input.window === 'hour' || input.window === 'day' || input.window === 'week' || input.window === 'month'
    ? input.window
    : 'month';
  const raw = input.model == null ? [] : Array.isArray(input.model) ? input.model : [input.model];
  const models = [...new Set(raw.map((model) => model.trim()).filter(Boolean))];
  if (models.length > MODEL_LIMIT || models.some((model) => !MODEL.test(model))) throw new Error('model must be a model name');
  return { window, hours: TRACE_WINDOWS[window], models };
};

/** ISO time `hours` before now. Span timestamps are ISO strings, so this compares in order. */
export const windowStart = (hours: number, now = Date.now()): string => new Date(now - hours * 60 * 60 * 1000).toISOString();
