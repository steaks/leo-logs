"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentOverviews = exports.pipelineOverviews = exports.groupTraces = exports.spanMs = exports.percentile = void 0;
const trace_1 = require("@leo-logs/trace");
const keyNames = (values) => [...new Set(values.filter(Boolean))].sort();
const later = (left, right) => {
    if (!left)
        return right;
    if (!right)
        return left;
    return left > right ? left : right;
};
const earlier = (left, right) => {
    if (!left)
        return right;
    if (!right)
        return left;
    return left < right ? left : right;
};
/** Inclusive percentile. `p` is 0–100. One sample returns that sample. */
const percentile = (values, p) => {
    const sorted = [...values].sort((left, right) => left - right);
    if (sorted.length <= 1)
        return sorted[0] ?? 0;
    const rank = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper)
        return sorted[lower] ?? 0;
    const left = sorted[lower] ?? 0;
    const right = sorted[upper] ?? left;
    return left + (right - left) * (rank - lower);
};
exports.percentile = percentile;
/** Wall-clock time from the first call start to the last call end. */
const spanMs = (started, ended) => {
    if (!started || !ended)
        return null;
    const start = Date.parse(started);
    const end = Date.parse(ended);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        return null;
    return end - start;
};
exports.spanMs = spanMs;
const shell = (pipeline) => ({
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
const add = (target, row) => {
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
const groupTraces = (rows) => {
    const pipelines = new Map();
    const agents = [];
    for (const row of rows) {
        const parsed = (0, trace_1.parseTraceId)(row.traceId);
        if (!parsed) {
            const session = row.sessionId ? (0, trace_1.parseTraceId)(row.sessionId) : null;
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
        const summary = {
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
    const byLatest = (left, right) => {
        const time = (right.latest ?? '').localeCompare(left.latest ?? '');
        return time === 0 ? left.name.localeCompare(right.name) : time;
    };
    for (const pipeline of pipelines.values())
        pipeline.agents.sort(byLatest);
    return {
        pipelines: [...pipelines.values()].sort(byLatest),
        agents: agents.sort(byLatest),
    };
};
exports.groupTraces = groupTraces;
/** Collapse executions that share a pipeline name. Latency is the mean wall-clock span. Model time is the mean sum of call durations. Cost is the mean cost of an execution. */
const pipelineOverviews = (pipelines) => {
    const groups = new Map();
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
        const latencies = executions.map((execution) => (0, exports.spanMs)(execution.started, execution.ended)).filter((value) => value != null);
        const agents = new Set(executions.flatMap((execution) => execution.agents.map((agent) => agent.name)));
        const keys = keyNames(executions.flatMap((execution) => execution.apiKeyNames));
        const models = keyNames(executions.flatMap((execution) => execution.models));
        const latest = executions.reduce((value, execution) => later(value, execution.latest), null);
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
            costP50: (0, exports.percentile)(costs, 50),
            costP75: (0, exports.percentile)(costs, 75),
            costP90: (0, exports.percentile)(costs, 90),
            costP95: (0, exports.percentile)(costs, 95),
            latest,
        };
    }).sort((left, right) => {
        const time = (right.latest ?? '').localeCompare(left.latest ?? '');
        return time === 0 ? left.name.localeCompare(right.name) : time;
    }).map(({ latest: _latest, ...overview }) => overview);
};
exports.pipelineOverviews = pipelineOverviews;
/** Collapse executions that share an agent name and, when present, a pipeline name. */
const agentOverviews = (pipelines, agents) => {
    const groups = new Map();
    const push = (agent, pipelineName) => {
        const key = `${pipelineName ?? ''}\0${agent.name}`;
        const group = groups.get(key) ?? { name: agent.name, pipelineName, items: [] };
        group.items.push(agent);
        groups.set(key, group);
    };
    for (const pipeline of pipelines) {
        for (const agent of pipeline.agents)
            push(agent, pipeline.name);
    }
    for (const agent of agents)
        push(agent, null);
    return [...groups.values()].map((group) => {
        const cost = group.items.reduce((sum, item) => sum + item.cost, 0);
        const failures = group.items.reduce((sum, item) => sum + item.failures, 0);
        const keys = keyNames(group.items.flatMap((item) => item.apiKeyNames));
        const durationMs = group.items.reduce((sum, item) => sum + item.durationMs, 0);
        const samples = group.items.reduce((sum, item) => sum + item.durationSamples, 0);
        const latest = group.items.reduce((value, item) => later(value, item.latest), null);
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
        if (time !== 0)
            return time;
        const pipeline = (left.pipelineName ?? '').localeCompare(right.pipelineName ?? '');
        return pipeline === 0 ? left.name.localeCompare(right.name) : pipeline;
    }).map(({ latest: _latest, ...overview }) => overview);
};
exports.agentOverviews = agentOverviews;
//# sourceMappingURL=group.js.map