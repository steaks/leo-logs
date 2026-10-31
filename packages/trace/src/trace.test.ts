import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, mock } from 'node:test';
import { createAgent, createPipeline, parseTraceId, type LogLine } from './trace';

const useOutbox = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'leo-logs-outbox-'));
  process.env.LEO_LOGS_SPOOL = dir;
  process.env.LEO_LOGS_URL = 'http://logs.example';
  process.env.LEO_LOGS_TOKEN = 'secret';
  return dir;
};

const done = (dir: string, fetchImpl: typeof fetch): void => {
  mock.timers.reset();
  mock.restoreAll();
  globalThis.fetch = fetchImpl;
  delete process.env.LEO_LOGS_URL;
  delete process.env.LEO_LOGS_TOKEN;
  delete process.env.LEO_LOGS_SPOOL;
  rmSync(dir, { recursive: true, force: true });
};

describe('trace ids', () => {
  it('keeps a pipeline id stable and parseable', () => {
    const pipeline = createPipeline('my-pipeline');
    assert.equal(pipeline.sessionId(), pipeline.sessionId());
    assert.equal(parseTraceId(pipeline.sessionId())?.kind, 'pipeline');
    assert.equal(parseTraceId(pipeline.sessionId())?.name, 'my-pipeline');
    assert.equal(parseTraceId(pipeline.sessionId())?.id, pipeline.id);
  });

  it('creates an agent from the pipeline', () => {
    const pipeline = createPipeline('my-pipeline');
    const agent = pipeline.agent('simple');
    assert.equal(agent.pipeline, pipeline);
    assert.equal(agent.traceId(), `${pipeline.sessionId()}_agent:simple-execution:${agent.id}`);
    assert.equal(agent.traceId(), agent.traceId());
    assert.equal(agent.sessionId(), pipeline.sessionId());
  });

  it('prefixes an agent with its pipeline', () => {
    const pipeline = createPipeline('my-pipeline');
    const agent = createAgent('simple', pipeline);
    assert.equal(agent.traceId(), `${pipeline.sessionId()}_agent:simple-execution:${agent.id}`);
    const parsed = parseTraceId(agent.traceId());
    assert.equal(parsed?.kind, 'agent');
    if (parsed?.kind !== 'agent') return;
    assert.equal(parsed.pipeline?.traceId, pipeline.sessionId());
    assert.equal(parsed.name, 'simple');
  });

  it('leaves an agent without a pipeline unprefixed', () => {
    const agent = createAgent('solo');
    assert.match(agent.traceId(), /^agent:solo-/);
    const parsed = parseTraceId(agent.traceId());
    assert.equal(parsed?.kind, 'agent');
    if (parsed?.kind !== 'agent') return;
    assert.equal(parsed.pipeline, null);
    assert.equal(agent.sessionId(), null);
  });

  it('rejects an empty name and the agent separator', () => {
    assert.throws(() => createPipeline('  '), /Pipeline name is empty/);
    assert.throws(() => createAgent('desk_agent:one'), /cannot contain _agent:/);
  });

  it('records a pipeline start and end', () => {
    const lines: LogLine[] = [];
    mock.method(console, 'info', (line: LogLine) => lines.push(line));
    mock.method(console, 'error', (line: LogLine) => lines.push(line));
    const pipeline = createPipeline('support-reply');
    pipeline.start();
    pipeline.end({ success: true, result: 'shipped' });
    pipeline.end({ success: false, result: { reason: 'no carrier' } });
    assert.equal(lines[0]?.event, 'start');
    assert.equal(lines[0]?.sessionId, pipeline.sessionId());
    assert.equal(lines[0]?.traceId, null);
    assert.equal(lines[1]?.event, 'end');
    assert.equal(lines[1]?.success, true);
    assert.equal(lines[1]?.result, 'shipped');
    assert.equal(lines[1]?.level, 'info');
    assert.equal(lines[2]?.success, false);
    assert.equal(lines[2]?.level, 'error');
    assert.deepEqual(lines[2]?.result, { reason: 'no carrier' });
    mock.restoreAll();
  });

  it('logs a pipeline line with a null trace id', () => {
    const lines: LogLine[] = [];
    mock.method(console, 'info', (line: LogLine) => lines.push(line));
    mock.method(console, 'error', (line: LogLine) => lines.push(line));
    const pipeline = createPipeline('support-reply');
    const err = new Error('down');
    pipeline.info('Customer asked where the package is');
    pipeline.error({ err }, 'Carrier did not answer');
    assert.equal(lines.length, 2);
    assert.equal(lines[0]?.level, 'info');
    assert.equal(lines[0]?.message, 'Customer asked where the package is');
    assert.equal(lines[0]?.sessionId, pipeline.sessionId());
    assert.equal(lines[0]?.traceId, null);
    assert.equal(lines[1]?.level, 'error');
    assert.equal(lines[1]?.message, 'Carrier did not answer');
    assert.equal(lines[1]?.fields.err, err);
    mock.restoreAll();
  });

  it('logs an agent line on the pipeline session', () => {
    const lines: LogLine[] = [];
    mock.method(console, 'debug', (line: LogLine) => lines.push(line));
    const pipeline = createPipeline('support-reply');
    const track = pipeline.agent('track');
    track.debug({ orderId: '1042' }, 'Looking up the order');
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.level, 'debug');
    assert.equal(lines[0]?.message, 'Looking up the order');
    assert.equal(lines[0]?.fields.orderId, '1042');
    assert.equal(lines[0]?.sessionId, pipeline.sessionId());
    assert.equal(lines[0]?.traceId, track.traceId());
    mock.restoreAll();
  });

  it('posts a line to the log page', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const dir = useOutbox();
    const calls: { url: string; authorization: string; message: string; traceId: string | null }[] = [];
    mock.method(console, 'info', () => undefined);
    const original = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body)) as { message: string; traceId: string | null }[];
      const line = body[0];
      calls.push({ url: String(input), authorization: headers.get('authorization') ?? '', message: line?.message ?? '', traceId: line?.traceId ?? null });
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    try {
      const pipeline = createPipeline('support-reply');
      const track = pipeline.agent('track');
      track.info('Shipment is in transit');
      assert.match(readFileSync(join(dir, `${process.pid}.open.jsonl`), 'utf8'), /Shipment is in transit/);
      mock.timers.tick(1000);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls[0]?.url, 'http://logs.example/logs');
      assert.equal(calls[0]?.authorization, 'Bearer secret');
      assert.equal(calls[0]?.message, 'Shipment is in transit');
      assert.equal(calls[0]?.traceId, track.traceId());
      assert.deepEqual(readdirSync(dir), []);
    } finally {
      done(dir, original);
    }
  });

  it('sends waiting lines in one request', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const dir = useOutbox();
    const bodies: { message: string }[][] = [];
    mock.method(console, 'info', () => undefined);
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)) as { message: string }[]);
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    try {
      const pipeline = createPipeline('support-reply');
      pipeline.info('Customer asked where the package is');
      pipeline.info('Carrier answered');
      mock.timers.tick(1000);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(bodies.length, 1);
      assert.deepEqual(bodies[0]?.map((line) => line.message), ['Customer asked where the package is', 'Carrier answered']);
    } finally {
      done(dir, original);
    }
  });

  it('sends a full batch without waiting', async () => {
    const dir = useOutbox();
    const bodies: unknown[][] = [];
    mock.method(console, 'info', () => undefined);
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)) as unknown[]);
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    try {
      const pipeline = createPipeline('support-reply');
      for (let i = 0; i < 100; i += 1) pipeline.info(`line ${i}`);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(bodies.length, 1);
      assert.equal(bodies[0]?.length, 100);
    } finally {
      done(dir, original);
    }
  });

  it('sends a line left by a crashed process', async () => {
    const dir = useOutbox();
    const bodies: { message: string }[][] = [];
    mock.method(console, 'info', () => undefined);
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)) as { message: string }[]);
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    writeFileSync(join(dir, '2147483647.open.jsonl'), `${JSON.stringify({ level: 'info', message: 'left by a crash', fields: {}, sessionId: null, traceId: null, time: '2026-10-31T00:00:00.000Z' })}\n`);
    try {
      createPipeline('support-reply').info('after restart');
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(bodies[0]?.map((line) => line.message), ['left by a crash']);
    } finally {
      done(dir, original);
    }
  });

  it('retries when the log page is unavailable', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const dir = useOutbox();
    const statuses = [503, 200];
    let calls = 0;
    const failures: string[] = [];
    mock.method(console, 'info', () => undefined);
    mock.method(console, 'error', (message: string) => failures.push(message));
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response('', { status: statuses[calls++] ?? 500 })) as typeof fetch;
    try {
      createPipeline('support-reply').info('Customer asked where the package is');
      mock.timers.tick(1000);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls, 1);
      mock.timers.tick(1000);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls, 2);
      assert.deepEqual(failures, []);
    } finally {
      done(dir, original);
    }
  });

  it('reports a rejected line without retrying it', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const dir = useOutbox();
    let calls = 0;
    const failures: string[] = [];
    mock.method(console, 'info', () => undefined);
    mock.method(console, 'error', (message: string) => failures.push(message));
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response('', { status: 401 });
    }) as typeof fetch;
    try {
      createPipeline('support-reply').info('Customer asked where the package is');
      mock.timers.tick(1000);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls, 1);
      assert.deepEqual(failures, ['Leo Logs rejected the logs (401)']);
    } finally {
      done(dir, original);
    }
  });
});
