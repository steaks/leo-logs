import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parseTraceId } from '@leo-logs/trace';
import { spansFromOtlp } from './otlp';
import { openRouterProviders } from './openrouter';
import { traceQuery, type TraceQuery } from './query';
import { accessPage, gettingStartedPage, gettingStartedPaths } from './access-page';
import { openLogs, type LogDb, type LogRow, type LogSource, type LogSpan } from './sqlite';
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

const redirect = (response: ServerResponse, location: string) => {
  response.writeHead(302, { location, 'cache-control': 'no-store' });
  response.end();
};

const gettingStartedStep = (pathname: string): keyof typeof gettingStartedPaths | null => {
  for (const [step, path] of Object.entries(gettingStartedPaths)) {
    if (path === pathname) return step as keyof typeof gettingStartedPaths;
  }
  return null;
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

const sameSecret = (presented: string, expected: string): boolean => {
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** Accepts `Authorization: Bearer` when it matches the env token or the token created during setup. */
const authorized = (request: IncomingMessage, tokens: string[]): boolean => {
  const expected = tokens.filter((token) => token.length > 0);
  if (expected.length === 0) return false;
  const header = request.headers.authorization;
  const presented = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  return expected.some((token) => sameSecret(presented, token));
};

const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

/** A line from `pipeline.info` and the other level methods. */
const spansFromLogs = (body: unknown): LogSpan[] => {
  const lines = Array.isArray(body) ? body : [body];
  const spans: LogSpan[] = [];
  for (const line of lines) {
    const span = spanFromLog(line);
    if (span) spans.push(span);
  }
  return spans;
};

const spanFromLog = (body: unknown): LogSpan | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const line = body as { level?: unknown; message?: unknown; fields?: unknown; sessionId?: unknown; traceId?: unknown; time?: unknown; event?: unknown; success?: unknown; result?: unknown };
  if (typeof line.level !== 'string' || !LOG_LEVELS.has(line.level) || typeof line.message !== 'string') return null;
  const sessionId = typeof line.sessionId === 'string' ? line.sessionId : null;
  const traceId = typeof line.traceId === 'string' ? line.traceId : null;
  const storedTrace = traceId ?? sessionId;
  if (!storedTrace) return null;
  const fields = line.fields && typeof line.fields === 'object' && !Array.isArray(line.fields) ? { ...line.fields } : {};
  const event = line.event === 'start' || line.event === 'end' ? line.event : null;
  const success = line.success === true || line.success === false ? line.success : null;
  const metadata = { ...fields, ...(event ? { event } : {}), ...(success === null ? {} : { success }), ...(line.result !== undefined ? { result: line.result } : {}) };
  const failed = success === false || line.level === 'error' || line.level === 'fatal';
  return {
    traceId: storedTrace,
    spanId: randomUUID(),
    parentSpanId: null,
    userId: null,
    sessionId,
    timestamp: typeof line.time === 'string' ? line.time : new Date().toISOString(),
    durationMs: null,
    model: null,
    providerName: null,
    status: failed ? 'error' : 'ok',
    level: line.level,
    finishReason: null,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    apiKeyName: null,
    input: null,
    output: event === 'end' && line.result !== undefined ? line.result : line.message,
    metadata,
  };
};

const publicOrigin = (request: IncomingMessage): string => {
  const forwarded = request.headers['x-forwarded-proto'];
  const proto = forwarded === 'https' || forwarded === 'http' ? forwarded : 'http';
  const hostHeader = request.headers['x-forwarded-host'] ?? request.headers.host ?? '127.0.0.1';
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host}`;
};

/** `LEO_LOGS_USER` and `LEO_LOGS_PASSWORD` lock the page. POST /traces stays on the bearer token. */
const pageCredentials = (env: NodeJS.ProcessEnv): { user: string; password: string } | null => {
  const user = env.LEO_LOGS_USER?.trim() ?? '';
  const password = env.LEO_LOGS_PASSWORD?.trim() ?? '';
  if (!user && !password) return null;
  if (!user || !password) throw new Error('Set both LEO_LOGS_USER and LEO_LOGS_PASSWORD');
  return { user, password };
};

const signedIn = (request: IncomingMessage, user: string, password: string): boolean => {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const split = decoded.indexOf(':');
  if (split < 0) return false;
  return sameSecret(decoded.slice(0, split), user) && sameSecret(decoded.slice(split + 1), password);
};

const denyPage = (response: ServerResponse) => {
  response.writeHead(401, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'www-authenticate': 'Basic realm="Leo Logs"',
  });
  response.end('Unauthorized');
};

const PAGE_PATHS = new Set(['/', '/sessions', '/session', '/agents', '/executions', '/execution', '/settings']);

const cookieValue = (request: IncomingMessage, name: string): string => {
  const header = request.headers.cookie;
  if (!header) return '';
  for (const part of header.split(';')) {
    const text = part.trim();
    const split = text.indexOf('=');
    if (split < 0 || text.slice(0, split) !== name) continue;
    return decodeURIComponent(text.slice(split + 1));
  }
  return '';
};

const sessionCookie = (token: string, request: IncomingMessage): string => {
  const secure = request.headers['x-forwarded-proto'] === 'https';
  return `leo_logs=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`;
};

const clearSessionCookie = (request: IncomingMessage): string => {
  const secure = request.headers['x-forwarded-proto'] === 'https';
  return `leo_logs=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
};

const formCredentials = (body: unknown): { username: string; password: string } | string => {
  if (!body || typeof body !== 'object') return 'Expected a username and password';
  const username = (body as { username?: unknown }).username;
  const password = (body as { password?: unknown }).password;
  if (typeof username !== 'string' || !username.trim()) return 'Username is required';
  if (username.trim().length > 64) return 'Username is too long';
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  return { username: username.trim(), password };
};

const sendSession = (response: ServerResponse, request: IncomingMessage, token: string) => {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'set-cookie': sessionCookie(token, request),
  });
  response.end(JSON.stringify({ ok: true }));
};

/** Lets the request through once a saved login has a session. Returns false when the response is already sent. */
const admit = async (logs: LogDb, request: IncomingMessage, response: ServerResponse, url: URL, method: string): Promise<boolean> => {
  const account = logs.hasAccount();
  if ((url.pathname === '/setup' || url.pathname === '/login') && method === 'POST') {
    return saveLogin(logs, request, response, url.pathname === '/setup', account);
  }
  const step = gettingStartedStep(url.pathname);
  const page = PAGE_PATHS.has(url.pathname);
  if (logs.validSession(cookieValue(request, 'leo_logs'))) {
    if (logs.setupReady()) {
      if (step && method === 'GET') {
        redirect(response, '/');
        return false;
      }
      return true;
    }
    if (url.pathname === '/ready' && method === 'POST') {
      logs.finishSetup();
      send(response, 200, { ok: true }, 'application/json; charset=utf-8');
      return false;
    }
    if (method === 'GET' && (step === 'openrouter' || step === 'code')) {
      const token = logs.webhookToken() ?? '';
      send(response, 200, gettingStartedPage(step, `${publicOrigin(request)}/traces`, token), 'text/html; charset=utf-8');
      return false;
    }
    if (method === 'GET' && (page || step === 'account')) {
      redirect(response, gettingStartedPaths.openrouter);
      return false;
    }
    if (url.pathname.startsWith('/api/')) {
      send(response, 401, { error: 'Finish setup first' }, 'application/json; charset=utf-8');
      return false;
    }
    return true;
  }
  if (method === 'GET' && step === 'account' && !account) {
    send(response, 200, accessPage('setup'), 'text/html; charset=utf-8');
    return false;
  }
  if (method === 'GET' && !account && (page || step)) {
    redirect(response, gettingStartedPaths.account);
    return false;
  }
  if (method === 'GET' && account && step) {
    redirect(response, '/');
    return false;
  }
  if (page && method === 'GET') {
    send(response, 200, accessPage('login'), 'text/html; charset=utf-8');
    return false;
  }
  if (url.pathname.startsWith('/api/')) {
    send(response, 401, { error: account ? 'Sign in required' : 'Create the login first' }, 'application/json; charset=utf-8');
    return false;
  }
  return true;
};

const saveLogin = async (logs: LogDb, request: IncomingMessage, response: ServerResponse, setup: boolean, account: boolean): Promise<boolean> => {
  if (setup && account) {
    send(response, 409, { error: 'A login already exists' }, 'application/json; charset=utf-8');
    return false;
  }
  if (!setup && !account) {
    send(response, 404, { error: 'Create the login first' }, 'application/json; charset=utf-8');
    return false;
  }
  let body: unknown;
  try {
    body = JSON.parse(await readBody(request)) as unknown;
  } catch {
    send(response, 400, { error: 'Expected a username and password' }, 'application/json; charset=utf-8');
    return false;
  }
  const credentials = formCredentials(body);
  if (typeof credentials === 'string') {
    send(response, 400, { error: credentials }, 'application/json; charset=utf-8');
    return false;
  }
  if (setup) {
    try {
      logs.createAccount(credentials.username, credentials.password);
    } catch {
      send(response, 409, { error: 'A login already exists' }, 'application/json; charset=utf-8');
      return false;
    }
  } else if (!logs.checkAccount(credentials.username, credentials.password)) {
    send(response, 401, { error: 'Wrong username or password' }, 'application/json; charset=utf-8');
    return false;
  }
  sendSession(response, request, logs.openSession());
  return false;
};

const handle = async (
  source: LogSource,
  logs: LogDb | null,
  token: string,
  login: { user: string; password: string } | null,
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
    if (!authorized(request, [token, logs.webhookToken() ?? ''])) {
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
  if (url.pathname === '/logs' && method === 'POST') {
    if (!logs) {
      send(response, 404, { error: 'Not found' }, 'application/json; charset=utf-8');
      return;
    }
    if (!authorized(request, [token, logs.webhookToken() ?? ''])) {
      send(response, 401, { error: 'Unauthorized' }, 'application/json; charset=utf-8');
      return;
    }
    let raw = '';
    try {
      raw = await readBody(request);
    } catch {
      send(response, 413, { error: 'body is too large' }, 'application/json; charset=utf-8');
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      send(response, 400, { error: 'Expected a JSON body' }, 'application/json; charset=utf-8');
      return;
    }
    const spans = spansFromLogs(body);
    if (spans.length === 0) {
      send(response, 400, { error: 'Expected a log line' }, 'application/json; charset=utf-8');
      return;
    }
    logs.insert(spans);
    send(response, 200, { ok: true }, 'application/json; charset=utf-8');
    return;
  }
  if (login) {
    if (!signedIn(request, login.user, login.password)) {
      denyPage(response);
      return;
    }
  } else if (logs && !await admit(logs, request, response, url, method)) {
    return;
  }
  if (url.pathname === '/logout' && method === 'POST') {
    logs?.closeSession(cookieValue(request, 'leo_logs'));
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': clearSessionCookie(request),
    });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === '/api/settings' && method === 'GET') {
    send(response, 200, {
      username: logs?.username() ?? login?.user ?? null,
      token: logs?.webhookToken() || token || null,
      tracesUrl: `${publicOrigin(request)}/traces`,
      canChangePassword: Boolean(logs?.hasAccount()),
    }, 'application/json; charset=utf-8');
    return;
  }
  if (url.pathname === '/api/password' && method === 'POST') {
    if (!logs?.hasAccount()) {
      send(response, 400, { error: 'This login cannot be changed here' }, 'application/json; charset=utf-8');
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(await readBody(request)) as unknown;
    } catch {
      send(response, 400, { error: 'Expected the current password and a new password' }, 'application/json; charset=utf-8');
      return;
    }
    const current = body && typeof body === 'object' ? (body as { current?: unknown }).current : null;
    const next = body && typeof body === 'object' ? (body as { password?: unknown }).password : null;
    const confirm = body && typeof body === 'object' ? (body as { confirm?: unknown }).confirm : null;
    if (typeof current !== 'string' || typeof next !== 'string' || next.length < 8) {
      send(response, 400, { error: 'Password must be at least 8 characters' }, 'application/json; charset=utf-8');
      return;
    }
    if (typeof confirm !== 'string' || confirm !== next) {
      send(response, 400, { error: 'Passwords do not match' }, 'application/json; charset=utf-8');
      return;
    }
    if (!logs.changePassword(current, next)) {
      send(response, 401, { error: 'Wrong password' }, 'application/json; charset=utf-8');
      return;
    }
    send(response, 200, { ok: true }, 'application/json; charset=utf-8');
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
  if (PAGE_PATHS.has(url.pathname)) {
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
  const login = pageCredentials(options.env);
  let cachedProviders: Record<string, string> | null = null;
  const providers = options.providers ?? (async () => {
    if (cachedProviders) return cachedProviders;
    cachedProviders = await openRouterProviders();
    return cachedProviders;
  });
  const server = createServer((request, response) => {
    handle(source, logs, token, login, providers, request, response).catch((error: unknown) => {
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
