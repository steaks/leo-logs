"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowStart = exports.traceQuery = exports.TRACE_WINDOWS = exports.TRACE_ROW_LIMIT = void 0;
exports.TRACE_ROW_LIMIT = 200;
/** Hours behind the current time. The pipelines page defaults to the last 30 days. */
exports.TRACE_WINDOWS = {
    hour: 1,
    day: 24,
    week: 7 * 24,
    month: 30 * 24,
};
const MODEL = /^[A-Za-z0-9._:/@+-]{1,200}$/;
const MODEL_LIMIT = 50;
/** A missing window is the last 30 days. A missing model list means every model. */
const traceQuery = (input) => {
    const window = input.window === 'hour' || input.window === 'day' || input.window === 'week' || input.window === 'month'
        ? input.window
        : 'month';
    const raw = input.model == null ? [] : Array.isArray(input.model) ? input.model : [input.model];
    const models = [...new Set(raw.map((model) => model.trim()).filter(Boolean))];
    if (models.length > MODEL_LIMIT || models.some((model) => !MODEL.test(model)))
        throw new Error('model must be a model name');
    return { window, hours: exports.TRACE_WINDOWS[window], models };
};
exports.traceQuery = traceQuery;
/** ISO time `hours` before now. Span timestamps are ISO strings, so this compares in order. */
const windowStart = (hours, now = Date.now()) => new Date(now - hours * 60 * 60 * 1000).toISOString();
exports.windowStart = windowStart;
//# sourceMappingURL=query.js.map