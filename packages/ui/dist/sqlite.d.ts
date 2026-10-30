import { type AgentOverview, type AgentSummary, type PipelineOverview, type PipelineSummary } from './group';
import { type TraceQuery } from './query';
export declare const DEFAULT_LOG_FILE = ".leo-logs/logs.db";
/** `LEO_LOGS_DB` overrides `.leo-logs/logs.db`. */
export declare const logFileFromEnv: (env: NodeJS.ProcessEnv) => string;
export interface LogSpan {
    traceId: string;
    spanId: string;
    parentSpanId: string | null;
    userId: string | null;
    sessionId: string | null;
    timestamp: string | null;
    durationMs: number | null;
    model: string | null;
    providerName: string | null;
    status: string | null;
    level: string | null;
    finishReason: string | null;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    totalTokens: number;
    totalCost: number;
    apiKeyName: string | null;
    input: unknown;
    output: unknown;
    metadata: unknown;
}
export interface LogRow {
    traceId: string;
    spanId: string;
    parentSpanId: string | null;
    userId: string | null;
    sessionId: string | null;
    timestamp: string | null;
    durationMs: number | null;
    model: string | null;
    providerName: string | null;
    status: string | null;
    level: string | null;
    finishReason: string | null;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
    apiKeyName: string | null;
    input: unknown;
    output: unknown;
    metadata: unknown;
}
export interface LogCatalog {
    configured: boolean;
    message: string | null;
    table: string;
    overviews: PipelineOverview[];
    agentOverviews: AgentOverview[];
    pipelines: PipelineSummary[];
    agents: AgentSummary[];
    models: string[];
}
export interface LogSource {
    catalog(query?: TraceQuery): Promise<LogCatalog>;
    rows(scope: 'pipeline' | 'agent', traceId: string, query?: TraceQuery): Promise<LogRow[]>;
}
export interface LogDb {
    path: string;
    source: LogSource;
    insert(spans: LogSpan[]): number;
    close(): void;
}
/** Opens the SQLite log, creating the file and its directory. */
export declare const openLogs: (env: NodeJS.ProcessEnv) => LogDb;
//# sourceMappingURL=sqlite.d.ts.map