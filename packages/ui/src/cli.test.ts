import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { main } from './cli';

const capture = () => {
  let out = '';
  let err = '';
  return {
    stdout: { write: (chunk: string) => { out += chunk; } },
    stderr: { write: (chunk: string) => { err += chunk; } },
    read: () => ({ out, err }),
  };
};

describe('cli', () => {
  it('prints help', async () => {
    const io = capture();
    const code = await main(['--help'], { env: {}, ...io });
    assert.equal(code, 0);
    assert.match(io.read().out, /Leo Logs/);
    assert.match(io.read().out, /leo-logs ui/);
    assert.match(io.read().out, /\.leo-logs\/logs\.db/);
    assert.match(io.read().out, /\/traces/);
  });

  it('rejects an unknown command and a bad port', async () => {
    const unknown = capture();
    assert.equal(await main(['run'], { env: {}, ...unknown }), 1);
    assert.match(unknown.read().err, /leo-logs ui/);
    const port = capture();
    assert.equal(await main(['ui', '--port', '0'], { env: {}, ...port }), 1);
    assert.match(port.read().err, /--port/);
  });
});
