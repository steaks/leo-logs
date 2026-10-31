import { postLine } from './http';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PIPELINE = new RegExp(`^pipeline:(.+)-execution:(${UUID})$`, 'i');
const AGENT = new RegExp(`^agent:(.+)-execution:(${UUID})$`, 'i');
const PIPELINED_AGENT = new RegExp(`^(pipeline:(.+)-execution:(${UUID}))_agent:(.+)-execution:(${UUID})$`, 'i');

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

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

export type PipelineResult = string | number | boolean | null | PipelineResult[] | { [key: string]: PipelineResult };

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

const emit = (line: LogLine): void => {
  postLine(line);
  if (line.level === 'debug') console.debug(line);
  else if (line.level === 'warn') console.warn(line);
  else if (line.level === 'error' || line.level === 'fatal') console.error(line);
  else console.info(line);
};

const write = (level: LogLevel, sessionId: string | null, traceId: string | null) => (first: string | LogFields, second?: string): void => {
  const fields: LogFields = typeof first === 'string' ? {} : first;
  const message = typeof first === 'string' ? first : (second ?? '');
  emit({ level, message, fields, sessionId, traceId, time: new Date().toISOString() });
};

const logs = (sessionId: string | null, traceId: string | null) => ({
  debug: write('debug', sessionId, traceId),
  info: write('info', sessionId, traceId),
  warn: write('warn', sessionId, traceId),
  error: write('error', sessionId, traceId),
  fatal: write('fatal', sessionId, traceId),
});

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
    agent: (agentName: string) => createAgent(agentName, pipeline),
    start: () => emit({ level: 'info', message: 'start', fields: {}, sessionId, traceId: null, time: new Date().toISOString(), event: 'start' }),
    end: (outcome) => {
      let message = '';
      try {
        message = typeof outcome.result === 'string' ? outcome.result : JSON.stringify(outcome.result);
      } catch (error) {
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
    ...logs(pipeline ? pipeline.sessionId() : null, traceId),
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
