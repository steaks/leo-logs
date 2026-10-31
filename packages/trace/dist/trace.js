"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTraceId = exports.createAgent = exports.createPipeline = exports.LOG_LEVELS = void 0;
const http_1 = require("./http");
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PIPELINE = new RegExp(`^pipeline:(.+)-execution:(${UUID})$`, 'i');
const AGENT = new RegExp(`^agent:(.+)-execution:(${UUID})$`, 'i');
const PIPELINED_AGENT = new RegExp(`^(pipeline:(.+)-execution:(${UUID}))_agent:(.+)-execution:(${UUID})$`, 'i');
exports.LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const nameOf = (name, label) => {
    const trimmed = name.trim();
    if (!trimmed)
        throw new Error(`${label} name is empty`);
    if (trimmed.includes('_agent:'))
        throw new Error(`${label} name cannot contain _agent:`);
    return trimmed;
};
const emit = (line) => {
    (0, http_1.postLine)(line);
    if (line.level === 'debug')
        console.debug(line);
    else if (line.level === 'warn')
        console.warn(line);
    else if (line.level === 'error' || line.level === 'fatal')
        console.error(line);
    else
        console.info(line);
};
const write = (level, sessionId, traceId) => (first, second) => {
    const fields = typeof first === 'string' ? {} : first;
    const message = typeof first === 'string' ? first : (second ?? '');
    emit({ level, message, fields, sessionId, traceId, time: new Date().toISOString() });
};
const logs = (sessionId, traceId) => ({
    debug: write('debug', sessionId, traceId),
    info: write('info', sessionId, traceId),
    warn: write('warn', sessionId, traceId),
    error: write('error', sessionId, traceId),
    fatal: write('fatal', sessionId, traceId),
});
/** A pipeline session id is `pipeline:{name}-execution:{uuid}`. The uuid stays fixed for this object. */
const createPipeline = (name) => {
    const pipelineName = nameOf(name, 'Pipeline');
    const id = crypto.randomUUID();
    const sessionId = `pipeline:${pipelineName}-execution:${id}`;
    if (!(0, exports.parseTraceId)(sessionId))
        throw new Error('Pipeline name cannot be used in a trace id');
    const pipeline = {
        id,
        name: pipelineName,
        sessionId: () => sessionId,
        agent: (agentName) => (0, exports.createAgent)(agentName, pipeline),
        start: () => emit({ level: 'info', message: 'start', fields: {}, sessionId, traceId: null, time: new Date().toISOString(), event: 'start' }),
        end: (outcome) => {
            let message = '';
            try {
                message = typeof outcome.result === 'string' ? outcome.result : JSON.stringify(outcome.result);
            }
            catch (error) {
                console.error('Leo Logs could not send the line', error);
                return;
            }
            emit({
                level: outcome.success ? 'info' : 'error',
                message,
                fields: {},
                sessionId,
                traceId: null,
                time: new Date().toISOString(),
                event: 'end',
                success: outcome.success,
                result: outcome.result,
            });
        },
        ...logs(sessionId, null),
    };
    return pipeline;
};
exports.createPipeline = createPipeline;
/** An agent trace id is `agent:{name}-execution:{uuid}`, prefixed with the pipeline id when one is passed. */
const createAgent = (name, pipeline) => {
    const agentName = nameOf(name, 'Agent');
    const id = crypto.randomUUID();
    const agentTraceId = `agent:${agentName}-execution:${id}`;
    const traceId = pipeline ? `${pipeline.sessionId()}_${agentTraceId}` : agentTraceId;
    if (!(0, exports.parseTraceId)(traceId))
        throw new Error('Agent name cannot be used in a trace id');
    return {
        id,
        name: agentName,
        ...(pipeline ? { pipeline } : {}),
        traceId: () => traceId,
        sessionId: () => pipeline ? pipeline.sessionId() : null,
        ...logs(pipeline ? pipeline.sessionId() : null, traceId),
    };
};
exports.createAgent = createAgent;
const parseTraceId = (traceId) => {
    const pipelined = PIPELINED_AGENT.exec(traceId);
    if (pipelined) {
        const pipelineTraceId = pipelined[1];
        const pipelineName = pipelined[2];
        const pipelineId = pipelined[3];
        const name = pipelined[4];
        const id = pipelined[5];
        if (!pipelineTraceId || !pipelineName || !pipelineId || !name || !id)
            return null;
        if (pipelineName.includes('_agent:') || name.includes('_agent:'))
            return null;
        return {
            kind: 'agent',
            name,
            id,
            traceId,
            pipeline: { name: pipelineName, id: pipelineId, traceId: pipelineTraceId },
        };
    }
    const pipeline = PIPELINE.exec(traceId);
    if (pipeline) {
        const name = pipeline[1];
        const id = pipeline[2];
        if (!name || !id || name.includes('_agent:'))
            return null;
        return { kind: 'pipeline', name, id, traceId };
    }
    const agent = AGENT.exec(traceId);
    if (agent) {
        const name = agent[1];
        const id = agent[2];
        if (!name || !id || name.includes('_agent:'))
            return null;
        return { kind: 'agent', name, id, traceId, pipeline: null };
    }
    return null;
};
exports.parseTraceId = parseTraceId;
//# sourceMappingURL=trace.js.map