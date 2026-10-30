import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { agentOverviews, groupTraces, pipelineOverviews, type AgentOverview, type AgentSummary, type PipelineOverview, type PipelineSummary, type TraceSummary } from './group';
import { requestTraceId } from './otlp';
import { TRACE_ROW_LIMIT, TRACE_WINDOWS, traceQuery, windowStart, type TraceQuery } from './query';

export const DEFAULT_LOG_FILE = '.leo-logs/logs.db';

/** `LEO_LOGS_DB` overrides `.leo-logs/logs.db`. */
export const logFileFromEnv = (env: NodeJS.ProcessEnv): string => env.LEO_LOGS_DB?.trim() || DEFAULT_LOG_FILE;

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
  hasAccount(): boolean;
  username(): string | null;
  changePassword(current: string, next: string): boolean;
  createAccount(username: string, password: string): string;
  webhookToken(): string | null;
  setupReady(): boolean;
  finishSetup(): void;
  checkAccount(username: string, password: string): boolean;
  openSession(): string;
  validSession(token: string): boolean;
  closeSession(token: string): void;
  insert(spans: LogSpan[]): number;
  close(): void;
}

const sameSecretText = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const jsonText = (value: unknown): string | null => {
  if (value == null) return null;
  return JSON.stringify(value);
};

const jsonOf = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const numberOf = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const rowOf = (row: Record<string, unknown>): LogSpan => ({
  traceId: requestTraceId(jsonOf(row.output)) ?? requestTraceId(jsonOf(row.input)) ?? text(row.trace_id) ?? '',
  spanId: text(row.span_id) ?? '',
  parentSpanId: text(row.parent_span_id),
  userId: text(row.user_id),
  sessionId: text(row.session_id),
  timestamp: text(row.timestamp),
  durationMs: row.duration_ms == null ? null : numberOf(row.duration_ms),
  model: text(row.model),
  providerName: text(row.provider_name),
  status: text(row.status),
  level: text(row.level),
  finishReason: text(row.finish_reason),
  promptTokens: numberOf(row.prompt_tokens),
  completionTokens: numberOf(row.completion_tokens),
  cachedTokens: numberOf(row.cached_tokens),
  totalTokens: numberOf(row.total_tokens),
  totalCost: numberOf(row.total_cost),
  apiKeyName: text(row.api_key_name),
  input: jsonOf(row.input),
  output: jsonOf(row.output),
  metadata: jsonOf(row.metadata),
});

const publicRow = (span: LogSpan): LogRow => {
  const { cachedTokens: _cachedTokens, ...row } = span;
  return row;
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (character) => `\\${character}`);

const likePrefix = (traceId: string): string => `${escapeLike(traceId)}${escapeLike('_agent:')}%`;

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

const endedAt = (timestamp: string | null, durationMs: number | null): string | null => {
  if (!timestamp || durationMs == null) return timestamp;
  const start = Date.parse(timestamp);
  if (!Number.isFinite(start)) return timestamp;
  return new Date(start + durationMs).toISOString();
};

const summaries = (spans: LogSpan[]): TraceSummary[] => {
  const groups = new Map<string, TraceSummary>();
  for (const span of spans) {
    const current = groups.get(span.traceId) ?? {
      traceId: span.traceId,
      sessionId: null,
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
    };
    current.calls += 1;
    current.tokens += span.totalTokens;
    current.promptTokens = (current.promptTokens ?? 0) + span.promptTokens;
    current.completionTokens = (current.completionTokens ?? 0) + span.completionTokens;
    current.cachedTokens = (current.cachedTokens ?? 0) + span.cachedTokens;
    current.cost += span.totalCost;
    if (span.durationMs != null) {
      current.durationMs += span.durationMs;
      current.durationSamples += 1;
    }
    if (span.status === 'error') current.failures += 1;
    if (span.apiKeyName) current.apiKeyNames = [...new Set([...current.apiKeyNames, span.apiKeyName])].sort();
    if (span.model) current.models = [...new Set([...current.models, span.model])].sort();
    current.sessionId = current.sessionId || span.sessionId;
    current.latest = later(current.latest, span.timestamp);
    current.started = earlier(current.started ?? null, span.timestamp);
    current.ended = later(current.ended ?? null, endedAt(span.timestamp, span.durationMs));
    groups.set(span.traceId, current);
  }
  return [...groups.values()];
};

/** Opens the SQLite log, creating the file and its directory. */
export const openLogs = (env: NodeJS.ProcessEnv): LogDb => {
  const path = logFileFromEnv(env);
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS spans (
      trace_id TEXT NOT NULL,
      span_id TEXT NOT NULL,
      parent_span_id TEXT,
      user_id TEXT,
      session_id TEXT,
      timestamp TEXT,
      duration_ms REAL,
      model TEXT,
      provider_name TEXT,
      status TEXT,
      level TEXT,
      finish_reason TEXT,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cached_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      api_key_name TEXT,
      input TEXT,
      output TEXT,
      metadata TEXT,
      PRIMARY KEY (trace_id, span_id)
    );
    CREATE INDEX IF NOT EXISTS spans_timestamp ON spans (timestamp);
    CREATE INDEX IF NOT EXISTS spans_session ON spans (session_id);
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      webhook_token TEXT NOT NULL DEFAULT '',
      ready INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `);
  const accountColumns = new Set((db.prepare('PRAGMA table_info(account)').all() as { name: string }[]).map((column) => column.name));
  if (!accountColumns.has('webhook_token')) db.exec(`ALTER TABLE account ADD COLUMN webhook_token TEXT NOT NULL DEFAULT ''`);
  if (!accountColumns.has('ready')) db.exec('ALTER TABLE account ADD COLUMN ready INTEGER NOT NULL DEFAULT 0');
  const passwordHash = (password: string, salt: Buffer): string => scryptSync(password, salt, 32).toString('hex');
  const sessionHash = (token: string): string => createHash('sha256').update(token).digest('hex');
  const readAccount = db.prepare('SELECT username, password_hash, password_salt, webhook_token, ready FROM account WHERE id = 1');
  const writeAccount = db.prepare('INSERT INTO account (id, username, password_hash, password_salt, webhook_token, ready) VALUES (1, ?, ?, ?, ?, 0)');
  const markReady = db.prepare('UPDATE account SET ready = 1 WHERE id = 1');
  const updatePassword = db.prepare('UPDATE account SET password_hash = ?, password_salt = ? WHERE id = 1');
  const writeSession = db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)');
  const readSession = db.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?');
  const dropSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const dropExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  const insert = db.prepare(`
    INSERT INTO spans (
      trace_id, span_id, parent_span_id, user_id, session_id, timestamp, duration_ms,
      model, provider_name, status, level, finish_reason, prompt_tokens, completion_tokens,
      cached_tokens, total_tokens, total_cost, api_key_name, input, output, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (trace_id, span_id) DO UPDATE SET
      parent_span_id = excluded.parent_span_id,
      user_id = excluded.user_id,
      session_id = excluded.session_id,
      timestamp = excluded.timestamp,
      duration_ms = excluded.duration_ms,
      model = excluded.model,
      provider_name = excluded.provider_name,
      status = excluded.status,
      level = excluded.level,
      finish_reason = excluded.finish_reason,
      prompt_tokens = excluded.prompt_tokens,
      completion_tokens = excluded.completion_tokens,
      cached_tokens = excluded.cached_tokens,
      total_tokens = excluded.total_tokens,
      total_cost = excluded.total_cost,
      api_key_name = excluded.api_key_name,
      input = excluded.input,
      output = excluded.output,
      metadata = excluded.metadata
  `);
  const prune = db.prepare('DELETE FROM spans WHERE timestamp IS NOT NULL AND timestamp < ?');
  const adopt = db.prepare('UPDATE spans SET trace_id = ? WHERE trace_id = ? AND span_id = ?');
  const misplaced = db.prepare(`
    SELECT trace_id, span_id, input, output FROM spans
    WHERE instr(trace_id, 'pipeline:') = 0 AND instr(trace_id, 'agent:') = 0
  `);
  const forget = () => {
    prune.run(windowStart(TRACE_WINDOWS.month));
  };
  const repair = () => {
    const pending = misplaced.all() as Record<string, unknown>[];
    for (const row of pending) {
      const stored = text(row.trace_id) ?? '';
      const next = requestTraceId(jsonOf(row.output)) ?? requestTraceId(jsonOf(row.input));
      if (!next || next === stored || !text(row.span_id)) continue;
      adopt.run(next, stored, text(row.span_id));
    }
  };
  const selectWindow = (query: TraceQuery): LogSpan[] => {
    const models = query.models;
    const sql = `
      SELECT * FROM spans
      WHERE timestamp >= ?
        ${models.length > 0 ? `AND model IN (${models.map(() => '?').join(', ')})` : ''}
      ORDER BY timestamp DESC
    `;
    const rows = db.prepare(sql).all(windowStart(query.hours), ...models) as Record<string, unknown>[];
    return rows.map(rowOf);
  };
  return {
    path,
    hasAccount: () => readAccount.get() != null,
    username() {
      const row = readAccount.get() as { username?: string } | undefined;
      return row?.username ?? null;
    },
    changePassword(current, next) {
      const row = readAccount.get() as { username: string; password_hash: string; password_salt: string } | undefined;
      if (!row) return false;
      const hash = Buffer.from(passwordHash(current, Buffer.from(row.password_salt, 'hex')), 'hex');
      const stored = Buffer.from(row.password_hash, 'hex');
      if (hash.length !== stored.length || !timingSafeEqual(hash, stored)) return false;
      const salt = randomBytes(16);
      updatePassword.run(passwordHash(next, salt), salt.toString('hex'));
      return true;
    },
    createAccount(username, password) {
      if (readAccount.get() != null) throw new Error('A login already exists');
      const salt = randomBytes(16);
      const webhookToken = randomBytes(32).toString('hex');
      writeAccount.run(username, passwordHash(password, salt), salt.toString('hex'), webhookToken);
      return webhookToken;
    },
    webhookToken() {
      const row = readAccount.get() as { webhook_token?: string } | undefined;
      const token = row?.webhook_token?.trim() ?? '';
      return token || null;
    },
    setupReady() {
      const row = readAccount.get() as { ready?: number } | undefined;
      return row?.ready === 1;
    },
    finishSetup() {
      markReady.run();
    },
    checkAccount(username, password) {
      const row = readAccount.get() as { username: string; password_hash: string; password_salt: string } | undefined;
      if (!row) return false;
      const hash = Buffer.from(passwordHash(password, Buffer.from(row.password_salt, 'hex')), 'hex');
      const stored = Buffer.from(row.password_hash, 'hex');
      const samePassword = hash.length === stored.length && timingSafeEqual(hash, stored);
      const sameName = sameSecretText(username, row.username);
      return samePassword && sameName;
    },
    openSession() {
      dropExpired.run(Date.now());
      const token = randomBytes(32).toString('hex');
      writeSession.run(sessionHash(token), Date.now() + 30 * 24 * 60 * 60 * 1000);
      return token;
    },
    validSession(token) {
      if (!token) return false;
      const hash = sessionHash(token);
      const row = readSession.get(hash) as { expires_at: number } | undefined;
      if (!row) return false;
      if (row.expires_at <= Date.now()) {
        dropSession.run(hash);
        return false;
      }
      return true;
    },
    closeSession(token) {
      if (!token) return;
      dropSession.run(sessionHash(token));
    },
    source: {
      catalog: async (input) => {
        forget();
        repair();
        const query = input ?? traceQuery({});
        const spans = selectWindow(query);
        const models = db.prepare(`
          SELECT DISTINCT model FROM spans
          WHERE timestamp >= ? AND model IS NOT NULL AND model != ''
          ORDER BY model
        `).all(windowStart(query.hours)) as { model: string }[];
        const grouped = groupTraces(summaries(spans).filter((row) => row.traceId));
        return {
          configured: true,
          message: null,
          table: path,
          overviews: pipelineOverviews(grouped.pipelines),
          agentOverviews: agentOverviews(grouped.pipelines, grouped.agents),
          models: models.map((row) => row.model),
          ...grouped,
        };
      },
      rows: async (scope, traceId, input) => {
        repair();
        const query = input ?? traceQuery({});
        const models = query.models;
        const match = scope === 'agent'
          ? 'trace_id = ?'
          : "(trace_id = ? OR trace_id LIKE ? ESCAPE '\\' OR session_id = ?)";
        const sql = `
          SELECT * FROM spans
          WHERE timestamp >= ?
            AND ${match}
            ${models.length > 0 ? `AND model IN (${models.map(() => '?').join(', ')})` : ''}
          ORDER BY timestamp DESC
          LIMIT ?
        `;
        const identity = scope === 'agent' ? [traceId] : [traceId, likePrefix(traceId), traceId];
        const rows = db.prepare(sql).all(windowStart(query.hours), ...identity, ...models, TRACE_ROW_LIMIT) as Record<string, unknown>[];
        return rows.map(rowOf).map(publicRow);
      },
    },
    insert(spans) {
      forget();
      if (spans.length === 0) return 0;
      db.exec('BEGIN');
      try {
        for (const span of spans) {
          insert.run(
            span.traceId,
            span.spanId,
            span.parentSpanId,
            span.userId,
            span.sessionId,
            span.timestamp,
            span.durationMs,
            span.model,
            span.providerName,
            span.status,
            span.level,
            span.finishReason,
            span.promptTokens,
            span.completionTokens,
            span.cachedTokens,
            span.totalTokens,
            span.totalCost,
            span.apiKeyName,
            jsonText(span.input),
            jsonText(span.output),
            jsonText(span.metadata),
          );
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return spans.length;
    },
    close() {
      db.close();
    },
  };
};
