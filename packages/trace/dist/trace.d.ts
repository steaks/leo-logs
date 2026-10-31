export declare const LOG_LEVELS: readonly ["debug", "info", "warn", "error", "fatal"];
export type LogLevel = (typeof LOG_LEVELS)[number];
export interface LogFields {
    err?: unknown;
    [key: string]: unknown;
}
export interface LogLine {
    level: LogLevel;
    message: string;
    fields: LogFields;
    sessionId: string | null;
    traceId: string | null;
    time: string;
    event?: 'start' | 'end';
    success?: boolean;
    result?: PipelineResult;
}
export interface LogMethod {
    (message: string): void;
    (fields: LogFields, message?: string): void;
}
export type PipelineResult = string | number | boolean | null | PipelineResult[] | {
    [key: string]: PipelineResult;
};
export interface PipelineEnd {
    success: boolean;
    result: PipelineResult;
}
export interface Pipeline {
    id: string;
    name: string;
    sessionId: () => string;
    agent: (name: string) => Agent;
    start: () => void;
    end: (outcome: PipelineEnd) => void;
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    fatal: LogMethod;
}
export interface Agent {
    id: string;
    name: string;
    pipeline?: Pipeline;
    traceId: () => string;
    /** The pipeline session when this agent belongs to one. */
    sessionId: () => string | null;
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    fatal: LogMethod;
}
export interface ParsedPipeline {
    name: string;
    id: string;
    traceId: string;
}
export type ParsedTrace = {
    kind: 'pipeline';
    name: string;
    id: string;
    traceId: string;
} | {
    kind: 'agent';
    name: string;
    id: string;
    traceId: string;
    pipeline: ParsedPipeline | null;
};
/** A pipeline session id is `pipeline:{name}-execution:{uuid}`. The uuid stays fixed for this object. */
export declare const createPipeline: (name: string) => Pipeline;
/** An agent trace id is `agent:{name}-execution:{uuid}`, prefixed with the pipeline id when one is passed. */
export declare const createAgent: (name: string, pipeline?: Pipeline) => Agent;
export declare const parseTraceId: (traceId: string) => ParsedTrace | null;
//# sourceMappingURL=trace.d.ts.map