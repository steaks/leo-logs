import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parseTraceId } from '@leo-logs/trace';
import { spansFromOtlp } from './otlp';
import { openRouterProviders } from './openrouter';
import { traceQuery, type TraceQuery } from './query';
import { openLogs, type LogDb, type LogRow, type LogSource } from './sqlite';
import { logPage } from './ui-page';

export interface LogUi {
  url: string;
  close: () => Promise<void>;
}

export interface LogUiOptions {
  port: number;
  env: NodeJS.ProcessEnv;
  source?: LogSource;
  logs?: LogDb;
  providers?: () => Promise<Record<string, string>>;
}

const send = (response: ServerResponse, status: number, body: unknown, type: string) => {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(payload);
};

const scopeOf = (value: string | null): 'pipeline' | 'agent' | null =>
  value === 'pipeline' || value === 'agent' ? value : null;

const queryOf = (url: URL): TraceQuery => traceQuery({
  window: url.searchParams.get('window'),
  model: url.searchParams.getAll('model'),
});

const presentRow = (row: LogRow) => {
  const parsed = parseTraceId(row.traceId);
  if (!parsed) return { ...row, executionId: null, agentName: null, pipelineExecutionId: null };
  if (parsed.kind === 'pipeline') {
    return { ...row, executionId: parsed.id, agentName: null, pipelineExecutionId: parsed.id };
  }
  return {
    ...row,
    executionId: parsed.id,
    agentName: parsed.name,
    pipelineExecutionId: parsed.pipeline?.id ?? null,
  };
};

type PresentedRow = ReturnType<typeof presentRow>;

/** OpenRouter logs some server-tool generations under a gen- id. Name each from the previous agent call in that session. */
const nameSessionAgents = (rows: PresentedRow[]): PresentedRow[] => {
  const ordered = rows.map((row, index) => ({ row, index }));
  ordered.sort((left, right) => {
    const leftTime = Date.parse(left.row.timestamp ?? '');
    const rightTime = Date.parse(right.row.timestamp ?? '');
    const leftOk = !Number.isNaN(leftTime);
    const rightOk = !Number.isNaN(rightTime);
    if (leftOk && rightOk && leftTime !== rightTime) return leftTime - rightTime;
    return left.index - right.index;
  });
  let agentName: string | null = null;
  let sessionId: string | null = null;
  for (const { row } of ordered) {
    if (row.agentName) {
      agentName = row.agentName;
      sessionId = row.sessionId;
      continue;
    }
    if (!agentName || parseTraceId(row.traceId)) continue;
    if (sessionId && row.sessionId && sessionId !== row.sessionId) continue;
    row.agentName = agentName;
  }
  return rows;
};

const BODY_LIMIT = 20_000_000;

const readBody = (request: IncomingMessage): Promise<string> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  let size = 0;
  request.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > BODY_LIMIT) {
      reject(new Error('body is too large'));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  request.on('error', reject);
});

/** `LEO_LOGS_TOKEN`, when set, is the bearer token OpenRouter sends on POST /traces. */
const authorized = (request: IncomingMessage, token: string): boolean => {
  if (!token) return true;
  const header = request.headers.authorization;
  const presented = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const left = Buffer.from(presented);
  const right = Buffer.from(token);
  return left.length === right.length && timingSafeEqual(left, right);
};

const handle = async (
  source: LogSource,
  logs: LogDb | null,
  token: string,
  providers: () => Promise<Record<string, string>>,
  request: IncomingMessage,
  response: ServerResponse,
) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';
  if (url.pathname === '/traces' && method === 'POST') {
    if (!logs) {
      send(response, 404, { error: 'Not found' }, 'application/json; charset=utf-8');
      return;
    }
    if (!authorized(request, token)) {
      send(response, 401, { error: 'Unauthorized' }, 'application/json; charset=utf-8');
      return;
    }
    const testing = request.headers['x-test-connection'] === 'true';
    let raw = '';
    try {
      raw = await readBody(request);
    } catch {
      send(response, 413, { error: 'body is too large' }, 'application/json; charset=utf-8');
      return;
    }
    if (!raw.trim()) {
      send(response, testing ? 200 : 400, testing ? { ok: true, spans: 0 } : { error: 'Expected a JSON body' }, 'application/json; charset=utf-8');
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      send(response, testing ? 200 : 400, testing ? { ok: true, spans: 0 } : { error: 'Expected a JSON body' }, 'application/json; charset=utf-8');
      return;
    }
    const spans = logs.insert(spansFromOtlp(body));
    send(response, 200, { ok: true, spans }, 'application/json; charset=utf-8');
    return;
  }
  if (url.pathname === '/api/providers') {
    if (method !== 'GET') {
      send(response, 405, { error: 'Method not allowed' }, 'application/json; charset=utf-8');
      return;
    }
    try {
      send(response, 200, { providers: await providers() }, 'application/json; charset=utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      send(response, 502, { error: message }, 'application/json; charset=utf-8');
    }
    return;
  }
  if (method !== 'GET') {
    send(response, 405, { error: 'Method not allowed' }, 'application/json; charset=utf-8');
    return;
  }
  if (url.pathname === '/' || url.pathname === '/sessions' || url.pathname === '/session' || url.pathname === '/agents' || url.pathname === '/executions' || url.pathname === '/execution') {
    send(response, 200, logPage(), 'text/html; charset=utf-8');
    return;
  }
  if (url.pathname === '/api/catalog' || url.pathname === '/api/rows') {
    let query: TraceQuery;
    try {
      query = queryOf(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      send(response, 400, { error: message }, 'application/json; charset=utf-8');
      return;
    }
    if (url.pathname === '/api/catalog') {
      send(response, 200, await source.catalog(query), 'application/json; charset=utf-8');
      return;
    }
    const scope = scopeOf(url.searchParams.get('scope'));
    const traceId = url.searchParams.get('traceId') ?? '';
    const parsed = parseTraceId(traceId);
    if (!scope || !parsed || parsed.kind !== scope) {
      send(response, 400, { error: 'scope and traceId must name a pipeline or an agent' }, 'application/json; charset=utf-8');
      return;
    }
    const rows = await source.rows(scope, traceId, query);
    const presented = rows.map(presentRow);
    send(response, 200, { rows: scope === 'pipeline' ? nameSessionAgents(presented) : presented }, 'application/json; charset=utf-8');
    return;
  }
  send(response, 404, { error: 'Not found' }, 'application/json; charset=utf-8');
};

export const startLogUi = async (options: LogUiOptions): Promise<LogUi> => {
  const logs = options.logs ?? (options.source ? null : openLogs(options.env));
  const source = options.source ?? logs?.source;
  if (!source) throw new Error('UI server has no log source');
  const token = options.env.LEO_LOGS_TOKEN?.trim() ?? '';
  let cachedProviders: Record<string, string> | null = null;
  const providers = options.providers ?? (async () => {
    if (cachedProviders) return cachedProviders;
    cachedProviders = await openRouterProviders();
    return cachedProviders;
  });
  const server = createServer((request, response) => {
    handle(source, logs, token, providers, request, response).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!response.headersSent) send(response, 500, { error: message }, 'application/json; charset=utf-8');
      else response.end();
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(options.port, '0.0.0.0', () => resolve());
    });
  } catch (error) {
    logs?.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string') {
    logs?.close();
    throw new Error('UI server has no port');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        logs?.close();
        if (error) reject(error);
        else resolve();
      });
    }),
  };
};
