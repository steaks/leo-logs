"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openLogs = exports.logFileFromEnv = exports.DEFAULT_LOG_FILE = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_sqlite_1 = require("node:sqlite");
const group_1 = require("./group");
const query_1 = require("./query");
exports.DEFAULT_LOG_FILE = '.leo-logs/logs.db';
/** `LEO_LOGS_DB` overrides `.leo-logs/logs.db`. */
const logFileFromEnv = (env) => env.LEO_LOGS_DB?.trim() || exports.DEFAULT_LOG_FILE;
exports.logFileFromEnv = logFileFromEnv;
const jsonText = (value) => {
    if (value == null)
        return null;
    return JSON.stringify(value);
};
const jsonOf = (value) => {
    if (typeof value !== 'string')
        return value ?? null;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
};
const text = (value) => (typeof value === 'string' ? value : null);
const numberOf = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const rowOf = (row) => ({
    traceId: text(row.trace_id) ?? '',
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
const publicRow = (span) => {
    const { cachedTokens: _cachedTokens, ...row } = span;
    return row;
};
const escapeLike = (value) => value.replace(/[\\%_]/g, (character) => `\\${character}`);
const likePrefix = (traceId) => `${escapeLike(traceId)}${escapeLike('_agent:')}%`;
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
const endedAt = (timestamp, durationMs) => {
    if (!timestamp || durationMs == null)
        return timestamp;
    const start = Date.parse(timestamp);
    if (!Number.isFinite(start))
        return timestamp;
    return new Date(start + durationMs).toISOString();
};
const summaries = (spans) => {
    const groups = new Map();
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
        if (span.status === 'error')
            current.failures += 1;
        if (span.apiKeyName)
            current.apiKeyNames = [...new Set([...current.apiKeyNames, span.apiKeyName])].sort();
        if (span.model)
            current.models = [...new Set([...current.models, span.model])].sort();
        current.sessionId = current.sessionId || span.sessionId;
        current.latest = later(current.latest, span.timestamp);
        current.started = earlier(current.started ?? null, span.timestamp);
        current.ended = later(current.ended ?? null, endedAt(span.timestamp, span.durationMs));
        groups.set(span.traceId, current);
    }
    return [...groups.values()];
};
/** Opens the SQLite log, creating the file and its directory. */
const openLogs = (env) => {
    const path = (0, exports.logFileFromEnv)(env);
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
    const db = new node_sqlite_1.DatabaseSync(path);
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
  `);
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
    const forget = () => {
        prune.run((0, query_1.windowStart)(query_1.TRACE_WINDOWS.month));
    };
    const selectWindow = (query) => {
        const models = query.models;
        const sql = `
      SELECT * FROM spans
      WHERE timestamp >= ?
        ${models.length > 0 ? `AND model IN (${models.map(() => '?').join(', ')})` : ''}
      ORDER BY timestamp DESC
    `;
        const rows = db.prepare(sql).all((0, query_1.windowStart)(query.hours), ...models);
        return rows.map(rowOf);
    };
    return {
        path,
        source: {
            catalog: async (input) => {
                forget();
                const query = input ?? (0, query_1.traceQuery)({});
                const spans = selectWindow(query);
                const models = db.prepare(`
          SELECT DISTINCT model FROM spans
          WHERE timestamp >= ? AND model IS NOT NULL AND model != ''
          ORDER BY model
        `).all((0, query_1.windowStart)(query.hours));
                const grouped = (0, group_1.groupTraces)(summaries(spans).filter((row) => row.traceId));
                return {
                    configured: true,
                    message: null,
                    table: path,
                    overviews: (0, group_1.pipelineOverviews)(grouped.pipelines),
                    agentOverviews: (0, group_1.agentOverviews)(grouped.pipelines, grouped.agents),
                    models: models.map((row) => row.model),
                    ...grouped,
                };
            },
            rows: async (scope, traceId, input) => {
                const query = input ?? (0, query_1.traceQuery)({});
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
                const rows = db.prepare(sql).all((0, query_1.windowStart)(query.hours), ...identity, ...models, query_1.TRACE_ROW_LIMIT);
                return rows.map(rowOf).map(publicRow);
            },
        },
        insert(spans) {
            forget();
            if (spans.length === 0)
                return 0;
            db.exec('BEGIN');
            try {
                for (const span of spans) {
                    insert.run(span.traceId, span.spanId, span.parentSpanId, span.userId, span.sessionId, span.timestamp, span.durationMs, span.model, span.providerName, span.status, span.level, span.finishReason, span.promptTokens, span.completionTokens, span.cachedTokens, span.totalTokens, span.totalCost, span.apiKeyName, jsonText(span.input), jsonText(span.output), jsonText(span.metadata));
                }
                db.exec('COMMIT');
            }
            catch (error) {
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
exports.openLogs = openLogs;
//# sourceMappingURL=sqlite.js.map