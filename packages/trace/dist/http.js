"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postLine = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1000;
const MIN_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const SPOOL_LIMIT_BYTES = 8 * 1024 * 1024;
let linesInActive = 0;
let sequence = 0;
let timer = null;
let activeDir = null;
let recoveredDir = null;
const inflight = new Set();
const spoolDir = () => {
    const configured = process.env.LEO_LOGS_SPOOL?.trim();
    return configured || (0, node_path_1.join)(process.cwd(), '.leo-logs', 'outbox');
};
const endpoint = () => {
    const url = process.env.LEO_LOGS_URL?.trim() ?? '';
    const token = process.env.LEO_LOGS_TOKEN?.trim() ?? '';
    if (!url || !token)
        return null;
    const trimmed = url.replace(/\/$/, '');
    return { url: trimmed.endsWith('/logs') ? trimmed : `${trimmed}/logs`, token };
};
const retryable = (status) => status === 408 || status === 429 || status >= 500;
const alive = (pid) => {
    if (pid === process.pid)
        return true;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
};
const pause = (ms) => new Promise((resolve) => {
    const waiting = setTimeout(resolve, ms);
    waiting.unref();
});
/** `LEO_LOGS_URL` is the log page. `LEO_LOGS_TOKEN` is the bearer token from that page. */
const postLine = (line) => {
    if (!endpoint())
        return;
    let text;
    try {
        text = `${JSON.stringify(line)}\n`;
    }
    catch (error) {
        console.error('Leo Logs could not send the line', error);
        return;
    }
    const dir = spoolDir();
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    if (dir !== activeDir) {
        if (timer)
            clearTimeout(timer);
        timer = null;
        activeDir = dir;
        linesInActive = 0;
        recoveredDir = null;
    }
    recover(dir);
    if (spoolBytes(dir) + Buffer.byteLength(text) > SPOOL_LIMIT_BYTES) {
        console.error('Leo Logs dropped a line because the outbox is full');
        return;
    }
    const fd = (0, node_fs_1.openSync)((0, node_path_1.join)(dir, `${process.pid}.open.jsonl`), 'a');
    try {
        (0, node_fs_1.writeSync)(fd, text);
        (0, node_fs_1.fsyncSync)(fd);
    }
    finally {
        (0, node_fs_1.closeSync)(fd);
    }
    linesInActive += 1;
    if (linesInActive >= BATCH_SIZE) {
        closeActive(dir);
        return;
    }
    if (timer)
        return;
    const waiting = setTimeout(() => {
        if (timer === waiting)
            timer = null;
        closeActive(dir);
    }, BATCH_DELAY_MS);
    waiting.unref();
    timer = waiting;
};
exports.postLine = postLine;
const recover = (dir) => {
    if (recoveredDir === dir)
        return;
    recoveredDir = dir;
    let names = [];
    try {
        names = (0, node_fs_1.readdirSync)(dir);
    }
    catch {
        return;
    }
    for (const name of names) {
        if (!name.endsWith('.jsonl'))
            continue;
        const pid = Number(name.split('.')[0]);
        if (!Number.isInteger(pid) || pid <= 0)
            continue;
        if (pid !== process.pid && alive(pid))
            continue;
        const path = (0, node_path_1.join)(dir, name);
        if (!name.endsWith('.open.jsonl')) {
            void deliver(path);
            continue;
        }
        const closed = (0, node_path_1.join)(dir, `${pid}.${sequence}.jsonl`);
        sequence += 1;
        try {
            (0, node_fs_1.renameSync)(path, closed);
        }
        catch {
            continue;
        }
        void deliver(closed);
    }
};
const closeActive = (dir) => {
    if (dir === activeDir && timer) {
        clearTimeout(timer);
        timer = null;
    }
    const path = (0, node_path_1.join)(dir, `${process.pid}.open.jsonl`);
    if (dir === activeDir)
        linesInActive = 0;
    if (!(0, node_fs_1.existsSync)(path))
        return;
    const closed = (0, node_path_1.join)(dir, `${process.pid}.${sequence}.jsonl`);
    sequence += 1;
    (0, node_fs_1.renameSync)(path, closed);
    void deliver(closed);
};
const deliver = async (path) => {
    if (inflight.has(path))
        return;
    inflight.add(path);
    try {
        let backoff = MIN_BACKOFF_MS;
        for (let attempt = 1;; attempt += 1) {
            const outcome = await post(path);
            if (outcome === 'sent' || outcome === 'drop') {
                try {
                    (0, node_fs_1.unlinkSync)(path);
                }
                catch {
                    // The file is already gone.
                }
                return;
            }
            if (outcome === 'missing' || outcome === 'idle')
                return;
            if (attempt === 10)
                console.error('Leo Logs could not reach the log page');
            await pause(backoff);
            backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        }
    }
    finally {
        inflight.delete(path);
    }
};
const post = async (path) => {
    if (!(0, node_fs_1.existsSync)(path))
        return 'missing';
    const target = endpoint();
    if (!target)
        return 'idle';
    const lines = readLines(path);
    if (lines.length === 0)
        return 'drop';
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(target.url, {
            method: 'POST',
            headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
            body: JSON.stringify(lines),
            signal: controller.signal,
        });
        await response.body?.cancel();
        if (response.ok)
            return 'sent';
        if (!retryable(response.status)) {
            console.error(`Leo Logs rejected the logs (${response.status})`);
            return 'drop';
        }
        return 'retry';
    }
    catch {
        return 'retry';
    }
    finally {
        clearTimeout(abort);
    }
};
const readLines = (path) => {
    const lines = [];
    for (const row of (0, node_fs_1.readFileSync)(path, 'utf8').split('\n')) {
        if (!row)
            continue;
        try {
            lines.push(JSON.parse(row));
        }
        catch (error) {
            console.error('Leo Logs could not send the line', error);
        }
    }
    return lines;
};
const spoolBytes = (dir) => {
    let total = 0;
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        try {
            total += (0, node_fs_1.statSync)((0, node_path_1.join)(dir, name)).size;
        }
        catch {
            // The file was removed while the directory was being read.
        }
    }
    return total;
};
process.on('beforeExit', () => {
    if (!endpoint() || !activeDir)
        return;
    closeActive(activeDir);
});
//# sourceMappingURL=http.js.map