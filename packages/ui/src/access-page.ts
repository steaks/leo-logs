const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const highlight = (source: string): string => {
  const pattern = /\/\/.*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b(?:import|from|const|await|new|return)\b|[A-Za-z_$][\w$]*(?=\s*[(:])/g;
  let html = '';
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(last, index));
    const text = match[0];
    const next = source[index + text.length];
    const kind = text.startsWith('//')
      ? 'cm'
      : text.startsWith("'") || text.startsWith('"') || text.startsWith('`')
      ? 'str'
      : next === '('
        ? 'fn'
        : next === ':'
          ? 'prop'
          : 'kw';
    html += `<span class="${kind}">${escapeHtml(text)}</span>`;
    last = index + text.length;
  }
  return html + escapeHtml(source.slice(last));
};

const highlightShell = (source: string): string => {
  const parts = source.split(' ');
  const [command, ...rest] = parts;
  if (!command || rest.length === 0) return escapeHtml(source);
  const packageName = rest[rest.length - 1] ?? '';
  const middle = rest.slice(0, -1);
  return `<span class="kw">${escapeHtml(command)}</span> ${middle.map(escapeHtml).join(' ')} <span class="str">${escapeHtml(packageName)}</span>`;
};

const broadcastGuide = `<a class="guide" href="https://openrouter.ai/docs/guides/features/broadcast" target="_blank" rel="noopener noreferrer">OpenRouter’s Broadcast guide</a>`;

/** The OpenRouter webhook steps. Settings shows the same list after setup is finished. */
export const openRouterSetup = (urlMarkup: string, headerMarkup: string): string => `<ol>
      <li>Open <a href="https://openrouter.ai/settings/observability" target="_blank" rel="noopener noreferrer">Settings → Observability</a>.</li>
      <li>Toggle the <strong>Enable Broadcast</strong> switch to turn on the feature.</li>
      <li>Scroll down to configure a webhook destination. Click <strong>Set Up</strong>.</li>
      <li>Set the URL to ${urlMarkup}</li>
      <li>Set the headers to ${headerMarkup}</li>
      <li>Scroll to <strong>Additional generation metadata</strong>. Check <strong>Cost</strong>, <strong>Identity</strong>, <strong>Request context</strong>, and <strong>Cost allocation</strong>.</li>
      <li>Click the <strong>Add</strong> button at the top right of the screen.</li>
    </ol>`;

/** The same Broadcast guide link, placed at the top right of setup. */
export const broadcastGuideLink = broadcastGuide;

const integrateExample = `import { OpenRouter } from '@openrouter/sdk';
import { createPipeline } from '@leo-logs/trace';

// Group of agents orchestrated to complete a task.
const pipeline = createPipeline('support-reply');
// One agent in the pipeline with a specific responsibility.
const agent = pipeline.agent('answer');

const client = new OpenRouter({ apiKey });
await client.chat.send({
  chatRequest: {
    model: 'z-ai/glm-5.3',
    messages: [{ role: 'user', content: 'My package never arrived. Can you help?' }],
    sessionId: agent.sessionId(),
    trace: { traceId: agent.traceId() },
  },
});`;

/** The install command and example. Settings shows the same sample after setup is finished. */
export const integrateCode = (): string => `<p class="lede">Install <code>@leo-logs/trace</code>. A pipeline is a group of agents orchestrated to complete a task. An agent is one of them, with a specific responsibility.</p>
<pre class="code install">${highlightShell('npm install @leo-logs/trace')}</pre>
<pre class="code example">${highlight(integrateExample)}</pre>`;

/** Each getting-started step is its own page. */
export const gettingStartedPaths = {
  account: '/getting-started/account',
  openrouter: '/getting-started/openrouter',
  code: '/getting-started/code',
} as const;

const stepLinks = (current: keyof typeof gettingStartedPaths): string => {
  const items = [
    ['account', gettingStartedPaths.account, '1 · Account'],
    ['openrouter', gettingStartedPaths.openrouter, '2 · Connect to OpenRouter'],
    ['code', gettingStartedPaths.code, '3 · Integrate the Code'],
  ] as const;
  const order = { account: 0, openrouter: 1, code: 2 };
  return items.map(([id, href, label]) => {
    const state = id === current ? 'current' : order[id] < order[current] ? 'done' : '';
    return `<a class="${state}" href="${href}">${label}</a>`;
  }).join('\n      ');
};

/** Shown once after the login is created. The token is the bearer OpenRouter sends to POST /traces. */
export const gettingStartedPage = (step: 'openrouter' | 'code', tracesUrl: string, token: string): string => {
  const url = escapeHtml(tracesUrl);
  const secret = escapeHtml(token);
  const header = escapeHtml(JSON.stringify({ Authorization: `Bearer ${token}` }));
  const steps = openRouterSetup(
    `<code class="url" data-traces-url="${url}">${url}</code>`,
    `<pre data-token="${secret}">${header}</pre>`,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${step === 'openrouter' ? 'Connect OpenRouter' : 'Integrate the Code'} — Leo Logs</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 15px/1.55 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(760px, calc(100% - 48px)); padding: 36px 40px 32px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 12px; font-size: 32px; letter-spacing: -0.03em; }
    p { margin: 0 0 24px; color: var(--muted); }
    ol { display: flex; flex-direction: column; gap: 18px; margin: 0 0 28px; padding-left: 1.3em; }
    li { margin: 0; }
    code, pre { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 13px; }
    code.url { display: block; margin-top: 10px; padding: 12px 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); word-break: break-all; }
    pre { margin: 12px 0 0; padding: 14px 16px; overflow-x: auto; white-space: nowrap; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); line-height: 1.55; }
    pre.code { white-space: pre; }
    pre .kw { color: #d6f25c; }
    pre .str { color: #ffb86b; }
    pre .fn { color: #c5d0ff; }
    pre .prop { color: #8fd3ff; }
    pre .cm { color: var(--muted); }
    pre.install { margin: 0 0 16px; }
    pre.example { margin: 0 0 28px; }
    [hidden] { display: none !important; }
    button { height: 42px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .kicker { margin: 0; color: var(--accent); font-size: 12px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
    .page-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 0 12px; }
    a.guide { flex: none; color: var(--ink); font-size: 13px; text-decoration: none; }
    a.guide:hover { text-decoration: underline; }
    .steps { display: flex; flex-wrap: wrap; gap: 8px; width: fit-content; max-width: 100%; margin: 0 0 28px; }
    .steps a { flex: none; padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--muted); font-size: 12px; font-weight: 650; text-decoration: none; }
    .steps .current { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
    .steps .done { color: var(--ink); }
    a.continue { display: flex; align-items: center; justify-content: center; height: 42px; width: 100%; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-weight: 650; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <div class="page-top">
      <p class="kicker">Getting started</p>
      ${broadcastGuide}
    </div>
    <div class="steps" aria-label="Getting started">
      ${stepLinks(step)}
    </div>
    ${step === 'openrouter' ? `<h1>Connect OpenRouter</h1>
    <p>This access token was created for this log file. Paste it into the webhook destination. Settings keeps a copy of these steps.</p>
    ${steps}
    <a class="continue" href="${gettingStartedPaths.code}">Continue</a>` : `    <h1>Integrate the Code</h1>
    ${integrateCode()}
    <button id="ready" type="button">Go to logs</button>
  <script>
    document.getElementById('ready').addEventListener('click', async () => {
      const response = await fetch('/ready', { method: 'POST' });
      if (response.ok) location.assign('/');
    });
  </script>`}
  </main>
</body>
</html>`;
};

const loginPage = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in — Leo Logs</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 14px/1.45 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(420px, calc(100% - 32px)); padding: 28px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.03em; }
    p { margin: 0 0 18px; color: var(--muted); }
    label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; color: var(--muted); font-size: 13px; }
    input { height: 38px; font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; }
    input:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    button { height: 38px; margin-top: 6px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
    .error { min-height: 1.2em; margin: 12px 0 0; color: #ffb4b4; }
  </style>
</head>
<body>
  <main>
    <h1>Leo Logs</h1>
    <p>Sign in to the log page.</p>
    <form>
      <label>Username <input name="username" autocomplete="username" required></label>
      <label>Password <input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
      <button type="submit">Sign in</button>
      <p class="error" role="alert"></p>
    </form>
  </main>
  <script>
    const form = document.querySelector('form');
    const error = document.querySelector('.error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      const data = new FormData(form);
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: data.get('username'), password: data.get('password') }),
      });
      if (response.ok) {
        location.assign('/');
        return;
      }
      const body = await response.json().catch(() => ({}));
      error.textContent = body.error || 'Could not sign in';
    });
  </script>
</body>
</html>`;

/** First visit: create the account. Later visits use {@link loginPage}. */
const setupPage = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Getting started — Leo Logs</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 14px/1.45 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(560px, calc(100% - 32px)); padding: 28px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.03em; }
    .kicker { margin: 0 0 8px; color: var(--accent); font-size: 12px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
    .lede { margin: 0 0 18px; color: var(--muted); }
    .steps { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; }
    .steps a { flex: none; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--muted); font-size: 12px; font-weight: 650; text-decoration: none; }
    .steps .current { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
    .steps .done { color: var(--ink); }
    label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; color: var(--muted); font-size: 13px; }
    label .row { display: flex; justify-content: space-between; gap: 12px; }
    label .hint { color: var(--muted); font-size: 12px; font-weight: 450; }
    input { height: 38px; font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; }
    input:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    button { height: 38px; margin-top: 6px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
    .error { min-height: 1.2em; margin: 12px 0 0; color: #ffb4b4; }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Getting started</p>
    <div class="steps" aria-label="Getting started">
      ${stepLinks('account')}
    </div>
    <h1>Create your account</h1>
    <p class="lede">This account is only for the log page on this machine. The next step connects OpenRouter so traces show up here.</p>
    <form>
      <label>Username <input name="username" autocomplete="username" required></label>
      <label><span class="row">Password <span class="hint">At least 8 characters</span></span><input name="password" type="password" autocomplete="new-password" required minlength="8"></label>
      <label>Confirm password <input name="confirm" type="password" autocomplete="new-password" required minlength="8"></label>
      <button type="submit">Continue</button>
      <p class="error" role="alert"></p>
    </form>
  </main>
  <script>
    const form = document.querySelector('form');
    const error = document.querySelector('.error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      const data = new FormData(form);
      const password = String(data.get('password') || '');
      const confirm = String(data.get('confirm') || '');
      if (password !== confirm) {
        error.textContent = 'Passwords do not match';
        return;
      }
      const response = await fetch('/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: data.get('username'), password }),
      });
      if (response.ok) {
        location.assign('${gettingStartedPaths.openrouter}');
        return;
      }
      const body = await response.json().catch(() => ({}));
      error.textContent = body.error || 'Could not create the account';
    });
  </script>
</body>
</html>`;

/** The first-run setup screen, or the sign-in screen after a login exists. */
export const accessPage = (mode: 'setup' | 'login'): string => mode === 'setup' ? setupPage() : loginPage();
