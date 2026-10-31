const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PIPELINE = new RegExp(`^pipeline:(.+)-execution:(${UUID})$`, 'i');
const AGENT = new RegExp(`^agent:(.+)-execution:(${UUID})$`, 'i');
const PIPELINED_AGENT = new RegExp(`^(pipeline:(.+)-execution:(${UUID}))_agent:(.+)-execution:(${UUID})$`, 'i');

export interface Pipeline {
  id: string;
  name: string;
  sessionId: () => string;
  agent: (name: string) => Agent;
}

export interface Agent {
  id: string;
  name: string;
  pipeline?: Pipeline;
  traceId: () => string;
  /** The pipeline session when this agent belongs to one. */
  sessionId: () => string | null;
}

export interface ParsedPipeline {
  name: string;
  id: string;
  traceId: string;
}

export type ParsedTrace =
  | { kind: 'pipeline'; name: string; id: string; traceId: string }
  | {
      kind: 'agent';
      name: string;
      id: string;
      traceId: string;
      pipeline: ParsedPipeline | null;
    };

const nameOf = (name: string, label: string): string => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(`${label} name is empty`);
  if (trimmed.includes('_agent:')) throw new Error(`${label} name cannot contain _agent:`);
  return trimmed;
};

/** A pipeline session id is `pipeline:{name}-execution:{uuid}`. The uuid stays fixed for this object. */
export const createPipeline = (name: string): Pipeline => {
  const pipelineName = nameOf(name, 'Pipeline');
  const id = crypto.randomUUID();
  const sessionId = `pipeline:${pipelineName}-execution:${id}`;
  if (!parseTraceId(sessionId)) throw new Error('Pipeline name cannot be used in a trace id');
  const pipeline: Pipeline = {
    id,
    name: pipelineName,
    sessionId: () => sessionId,
    agent: (agentName) => createAgent(agentName, pipeline),
  };
  return pipeline;
};

/** An agent trace id is `agent:{name}-execution:{uuid}`, prefixed with the pipeline id when one is passed. */
export const createAgent = (name: string, pipeline?: Pipeline): Agent => {
  const agentName = nameOf(name, 'Agent');
  const id = crypto.randomUUID();
  const agentTraceId = `agent:${agentName}-execution:${id}`;
  const traceId = pipeline ? `${pipeline.sessionId()}_${agentTraceId}` : agentTraceId;
  if (!parseTraceId(traceId)) throw new Error('Agent name cannot be used in a trace id');
  return {
    id,
    name: agentName,
    ...(pipeline ? { pipeline } : {}),
    traceId: () => traceId,
    sessionId: () => pipeline ? pipeline.sessionId() : null,
  };
};

export const parseTraceId = (traceId: string): ParsedTrace | null => {
  const pipelined = PIPELINED_AGENT.exec(traceId);
  if (pipelined) {
    const pipelineTraceId = pipelined[1];
    const pipelineName = pipelined[2];
    const pipelineId = pipelined[3];
    const name = pipelined[4];
    const id = pipelined[5];
    if (!pipelineTraceId || !pipelineName || !pipelineId || !name || !id) return null;
    if (pipelineName.includes('_agent:') || name.includes('_agent:')) return null;
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
    if (!name || !id || name.includes('_agent:')) return null;
    return { kind: 'pipeline', name, id, traceId };
  }
  const agent = AGENT.exec(traceId);
  if (agent) {
    const name = agent[1];
    const id = agent[2];
    if (!name || !id || name.includes('_agent:')) return null;
    return { kind: 'agent', name, id, traceId, pipeline: null };
  }
  return null;
};
