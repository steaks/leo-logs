export declare const TRACE_ROW_LIMIT = 200;
export type TraceWindow = 'hour' | 'day' | 'week' | 'month';
/** Hours behind the current time. The pipelines page defaults to the last 30 days. */
export declare const TRACE_WINDOWS: Record<TraceWindow, number>;
export interface TraceQuery {
    window: TraceWindow;
    hours: number;
    /** Empty means every model. */
    models: string[];
}
/** A missing window is the last 30 days. A missing model list means every model. */
export declare const traceQuery: (input: {
    window?: string | null;
    model?: string | string[] | null;
}) => TraceQuery;
/** ISO time `hours` before now. Span timestamps are ISO strings, so this compares in order. */
export declare const windowStart: (hours: number, now?: number) => string;
//# sourceMappingURL=query.d.ts.map