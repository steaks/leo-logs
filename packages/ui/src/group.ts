import { parseTraceId, type ParsedPipeline } from '@leo-logs/trace';

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

const keyNames = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();

const later = (left: string | null, right: string | null): string | null => {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
};

const earlier = (left: string | null, right: string | null): string | null => {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
};

/** Inclusive percentile. `p` is 0–100. One sample returns that sample. */
export const percentile = (values: number[], p: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length <= 1) return sorted[0] ?? 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower] ?? 0;
  const left = sorted[lower] ?? 0;
  const right = sorted[upper] ?? left;
  return left + (right - left) * (rank - lower);
};

/** Wall-clock time from the first call start to the last call end. */
export const spanMs = (started: string | null | undefined, ended: string | null | undefined): number | null => {
  if (!started || !ended) return null;
  const start = Date.parse(started);
  const end = Date.parse(ended);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
};

const shell = (pipeline: ParsedPipeline): PipelineSummary => ({
  name: pipeline.name,
  id: pipeline.id,
  traceId: pipeline.traceId,
  calls: 0,
  tokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  cachedTokens: 0,
  cost: 0,
  durationMs: 0,
  durationSamples: 0,
  failures: 0,
  apiKeyNames: [],
  models: [],
  latest: null,
  started: null,
  ended: null,
  agents: [],
});

const add = (target: PipelineSummary, row: TraceSummary) => {
  target.calls += row.calls;
  target.tokens += row.tokens;
  target.promptTokens += row.promptTokens ?? 0;
  target.completionTokens += row.completionTokens ?? 0;
  target.cachedTokens += row.cachedTokens ?? 0;
  target.cost += row.cost;
  target.durationMs += row.durationMs;
  target.durationSamples += row.durationSamples;
  target.failures += row.failures;
  target.apiKeyNames = keyNames([...target.apiKeyNames, ...row.apiKeyNames]);
  target.models = keyNames([...target.models, ...row.models]);
  target.latest = later(target.latest, row.latest);
  target.started = earlier(target.started, row.started ?? null);
  target.ended = later(target.ended, row.ended ?? null);
};

/** Group distinct trace ids into pipelines and agents that were called on their own. */
export const groupTraces = (rows: TraceSummary[]): { pipelines: PipelineSummary[]; agents: AgentSummary[] } => {
  const pipelines = new Map<string, PipelineSummary>();
  const agents: AgentSummary[] = [];
  for (const row of rows) {
    const parsed = parseTraceId(row.traceId);
    if (!parsed) {
      const session = row.sessionId ? parseTraceId(row.sessionId) : null;
      if (session?.kind === 'pipeline') {
        const pipeline = pipelines.get(session.traceId) ?? shell(session);
        add(pipeline, row);
        pipelines.set(session.traceId, pipeline);
      }
      continue;
    }
    if (parsed.kind === 'pipeline') {
      const pipeline = pipelines.get(parsed.traceId) ?? shell(parsed);
      add(pipeline, row);
      pipelines.set(parsed.traceId, pipeline);
      continue;
    }
    const summary: AgentSummary = {
      name: parsed.name,
      id: parsed.id,
      traceId: parsed.traceId,
      pipelineTraceId: parsed.pipeline?.traceId ?? null,
      calls: row.calls,
      tokens: row.tokens,
      promptTokens: row.promptTokens ?? 0,
      completionTokens: row.completionTokens ?? 0,
      cachedTokens: row.cachedTokens ?? 0,
      cost: row.cost,
      durationMs: row.durationMs,
      durationSamples: row.durationSamples,
      failures: row.failures,
      apiKeyNames: row.apiKeyNames,
      models: row.models,
      latest: row.latest,
      started: row.started ?? null,
      ended: row.ended ?? null,
    };
    if (!parsed.pipeline) {
      agents.push(summary);
      continue;
    }
    const pipeline = pipelines.get(parsed.pipeline.traceId) ?? shell(parsed.pipeline);
    add(pipeline, row);
    pipeline.agents.push(summary);
    pipelines.set(parsed.pipeline.traceId, pipeline);
  }
  const byLatest = (left: { latest: string | null; name: string }, right: { latest: string | null; name: string }) => {
    const time = (right.latest ?? '').localeCompare(left.latest ?? '');
    return time === 0 ? left.name.localeCompare(right.name) : time;
  };
  for (const pipeline of pipelines.values()) pipeline.agents.sort(byLatest);
  return {
    pipelines: [...pipelines.values()].sort(byLatest),
    agents: agents.sort(byLatest),
  };
};

/** Collapse executions that share a pipeline name. Latency is the mean wall-clock span. Model time is the mean sum of call durations. Cost is the mean cost of an execution. */
export const pipelineOverviews = (pipelines: PipelineSummary[]): PipelineOverview[] => {
  const groups = new Map<string, PipelineSummary[]>();
  for (const pipeline of pipelines) {
    const group = groups.get(pipeline.name) ?? [];
    group.push(pipeline);
    groups.set(pipeline.name, group);
  }
  return [...groups.entries()].map(([name, executions]) => {
    const costs = executions.map((execution) => execution.cost);
    const cost = costs.reduce((sum, value) => sum + value, 0);
    const tokens = executions.reduce((sum, execution) => sum + execution.tokens, 0);
    const inputTokens = executions.reduce((sum, execution) => sum + execution.promptTokens, 0);
    const outputTokens = executions.reduce((sum, execution) => sum + execution.completionTokens, 0);
    const cachedTokens = executions.reduce((sum, execution) => sum + execution.cachedTokens, 0);
    const failures = executions.reduce((sum, execution) => sum + execution.failures, 0);
    const timed = executions.filter((execution) => execution.durationSamples > 0);
    const durationMs = timed.reduce((sum, execution) => sum + execution.durationMs, 0);
    const latencies = executions.map((execution) => spanMs(execution.started, execution.ended)).filter((value): value is number => value != null);
    const agents = new Set(executions.flatMap((execution) => execution.agents.map((agent) => agent.name)));
    const keys = keyNames(executions.flatMap((execution) => execution.apiKeyNames));
    const models = keyNames(executions.flatMap((execution) => execution.models));
    const latest = executions.reduce<string | null>((value, execution) => later(value, execution.latest), null);
    return {
      name,
      executions: executions.length,
      agents: agents.size,
      failures,
      totalTokens: tokens,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalCost: cost,
      keyNames: keys,
      models,
      averageLatencyMs: latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : null,
      averageModelTimeMs: timed.length > 0 ? durationMs / timed.length : null,
      averageCost: cost / executions.length,
      costP50: percentile(costs, 50),
      costP75: percentile(costs, 75),
      costP90: percentile(costs, 90),
      costP95: percentile(costs, 95),
      latest,
    };
  }).sort((left, right) => {
    const time = (right.latest ?? '').localeCompare(left.latest ?? '');
    return time === 0 ? left.name.localeCompare(right.name) : time;
  }).map(({ latest: _latest, ...overview }) => overview);
};

/** Collapse executions that share an agent name and, when present, a pipeline name. */
export const agentOverviews = (pipelines: PipelineSummary[], agents: AgentSummary[]): AgentOverview[] => {
  const groups = new Map<string, { name: string; pipelineName: string | null; items: AgentSummary[] }>();
  const push = (agent: AgentSummary, pipelineName: string | null) => {
    const key = `${pipelineName ?? ''}\0${agent.name}`;
    const group = groups.get(key) ?? { name: agent.name, pipelineName, items: [] };
    group.items.push(agent);
    groups.set(key, group);
  };
  for (const pipeline of pipelines) {
    for (const agent of pipeline.agents) push(agent, pipeline.name);
  }
  for (const agent of agents) push(agent, null);
  return [...groups.values()].map((group) => {
    const cost = group.items.reduce((sum, item) => sum + item.cost, 0);
    const failures = group.items.reduce((sum, item) => sum + item.failures, 0);
    const keys = keyNames(group.items.flatMap((item) => item.apiKeyNames));
    const durationMs = group.items.reduce((sum, item) => sum + item.durationMs, 0);
    const samples = group.items.reduce((sum, item) => sum + item.durationSamples, 0);
    const latest = group.items.reduce<string | null>((value, item) => later(value, item.latest), null);
    return {
      name: group.name,
      pipelineName: group.pipelineName,
      executions: group.items.length,
      failures,
      keyNames: keys,
      averageLatencyMs: samples > 0 ? durationMs / samples : null,
      averageCost: cost / group.items.length,
      latest,
    };
  }).sort((left, right) => {
    const time = (right.latest ?? '').localeCompare(left.latest ?? '');
    if (time !== 0) return time;
    const pipeline = (left.pipelineName ?? '').localeCompare(right.pipelineName ?? '');
    return pipeline === 0 ? left.name.localeCompare(right.name) : pipeline;
  }).map(({ latest: _latest, ...overview }) => overview);
};
