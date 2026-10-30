export interface TraceSummary {
    traceId: string;
    /** Pipeline session id for a generation whose trace id is not an agent execution. */
    sessionId?: string | null;
    calls: number;
    tokens: number;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    cost: number;
    /** Sum of `duration_ms` for calls that reported one. */
    durationMs: number;
    durationSamples: number;
    /** Calls whose `status` is `error`. */
    failures: number;
    /** Distinct OpenRouter `api_key_name` values on this trace. */
    apiKeyNames: string[];
    /** Distinct model ids on this trace. */
    models: string[];
    latest: string | null;
    /** Earliest call start. `timestamp` is when the call started. */
    started?: string | null;
    /** Latest call end, `timestamp` plus `duration_ms`. */
    ended?: string | null;
}
export interface AgentSummary extends TraceSummary {
    name: string;
    id: string;
    pipelineTraceId: string | null;
}
export interface PipelineSummary {
    name: string;
    id: string;
    traceId: string;
    calls: number;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    cost: number;
    durationMs: number;
    durationSamples: number;
    failures: number;
    apiKeyNames: string[];
    models: string[];
    latest: string | null;
    /** Earliest call start in this session, across the pipeline and its agents. */
    started: string | null;
    /** Latest call end in this session. */
    ended: string | null;
    agents: AgentSummary[];
}
/** One row on the pipelines page. Cost and model time are averaged per execution. Model time is the sum of call durations. */
export interface PipelineOverview {
    name: string;
    executions: number;
    agents: number;
    failures: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    totalCost: number;
    keyNames: string[];
    models: string[];
    /** Mean wall-clock time from the first call start to the last call end. */
    averageLatencyMs: number | null;
    /** Mean sum of call durations. Overlapping calls are both included. */
    averageModelTimeMs: number | null;
    averageCost: number;
    /** Session-cost percentiles. Each sample is one execution's total cost. */
    costP50: number;
    costP75: number;
    costP90: number;
    costP95: number;
}
/** One row on the agents page. Cost and latency are averaged per execution. */
export interface AgentOverview {
    name: string;
    pipelineName: string | null;
    executions: number;
    failures: number;
    keyNames: string[];
    averageLatencyMs: number | null;
    averageCost: number;
}
/** Inclusive percentile. `p` is 0–100. One sample returns that sample. */
export declare const percentile: (values: number[], p: number) => number;
/** Wall-clock time from the first call start to the last call end. */
export declare const spanMs: (started: string | null | undefined, ended: string | null | undefined) => number | null;
/** Group distinct trace ids into pipelines and agents that were called on their own. */
export declare const groupTraces: (rows: TraceSummary[]) => {
    pipelines: PipelineSummary[];
    agents: AgentSummary[];
};
/** Collapse executions that share a pipeline name. Latency is the mean wall-clock span. Model time is the mean sum of call durations. Cost is the mean cost of an execution. */
export declare const pipelineOverviews: (pipelines: PipelineSummary[]) => PipelineOverview[];
/** Collapse executions that share an agent name and, when present, a pipeline name. */
export declare const agentOverviews: (pipelines: PipelineSummary[], agents: AgentSummary[]) => AgentOverview[];
//# sourceMappingURL=group.d.ts.map