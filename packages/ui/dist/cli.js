"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.HELP = void 0;
const node_util_1 = require("node:util");
const ui_1 = require("./ui");
exports.HELP = `
Leo Logs — OpenRouter logs for pipelines and agents

Usage:
  leo-logs ui [--port <n>]

The page lists pipelines and agents from the SQLite log. OpenRouter posts traces to /traces.
The file is .leo-logs/logs.db. LEO_LOGS_DB overrides that path.
LEO_LOGS_TOKEN, when set, requires Authorization: Bearer on POST /traces.

--port   Default: 8787. The server listens on 127.0.0.1.
`.trim();
const positiveInt = (value) => {
    if (!/^[1-9]\d*$/.test(value))
        return '--port must be a positive integer';
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > 65535)
        return '--port must be a positive integer';
    return parsed;
};
const main = async (argv, io) => {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        io.stdout.write(`${exports.HELP}\n`);
        return 0;
    }
    if (argv[0] !== 'ui') {
        io.stderr.write('Unknown command. Use leo-logs ui.\n');
        return 1;
    }
    let port = 8787;
    try {
        const parsed = (0, node_util_1.parseArgs)({
            args: argv.slice(1),
            options: { port: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
            strict: true,
        });
        if (parsed.values.help) {
            io.stdout.write(`${exports.HELP}\n`);
            return 0;
        }
        if (parsed.values.port !== undefined) {
            const value = positiveInt(parsed.values.port);
            if (typeof value === 'string') {
                io.stderr.write(`${value}\n`);
                return 1;
            }
            port = value;
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr.write(`${message}\n`);
        return 1;
    }
    const ui = await (0, ui_1.startLogUi)({ port, env: io.env });
    io.stdout.write(`${ui.url}\n`);
    await new Promise(() => { });
    return 0;
};
exports.main = main;
//# sourceMappingURL=cli.js.map