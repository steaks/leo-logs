const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Shown once after the login is created. The token is the bearer OpenRouter sends to POST /traces. */
export const gettingStartedPage = (tracesUrl: string, token: string): string => {
  const url = escapeHtml(tracesUrl);
  const secret = escapeHtml(token);
  const header = escapeHtml(JSON.stringify({ Authorization: `Bearer ${token}` }));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect OpenRouter — Leo Logs</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 15px/1.55 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(760px, calc(100% - 48px)); padding: 36px 40px 32px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 12px; font-size: 32px; letter-spacing: -0.03em; }
    p { margin: 0 0 24px; color: var(--muted); }
    ol { display: flex; flex-direction: column; gap: 18px; margin: 0 0 28px; padding-left: 1.3em; }
    li { margin: 0; }
    li ul { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 0; padding-left: 1.2em; }
    code, pre { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 13px; }
    code.url { display: block; margin-top: 10px; padding: 12px 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); word-break: break-all; }
    pre { margin: 12px 0 0; padding: 14px 16px; overflow-x: auto; white-space: nowrap; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); line-height: 1.55; }
    button { height: 42px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .kicker { margin: 0 0 12px; color: var(--accent); font-size: 12px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
    .steps { display: flex; gap: 8px; width: fit-content; max-width: 100%; margin: 0 0 28px; }
    .steps span { flex: none; padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--muted); font-size: 12px; font-weight: 650; }
    .steps .current { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
    .steps .done { color: var(--ink); }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Getting started</p>
    <div class="steps" aria-label="Getting started">
      <span class="done">1 · Account</span>
      <span class="current">2 · OpenRouter</span>
    </div>
    <h1>Connect OpenRouter</h1>
    <p>This access token was created for this log file. Paste it into the webhook destination. It is shown only on this screen.</p>
    <ol>
      <li>Open <a href="https://openrouter.ai/settings/observability">Settings → Observability</a> and turn on <strong>Enable Broadcast</strong>.</li>
      <li>Edit <strong>Webhook</strong>. Set the method to <code>POST</code> and the URL to <code class="url" data-traces-url="${url}">${url}</code></li>
      <li>Set the headers to <pre data-token="${secret}">${header}</pre></li>
      <li>On the destination form:
        <ul>
          <li>Choose <strong>Global</strong>.</li>
          <li>Check every <strong>Additional generation metadata</strong> option: <strong>Cost</strong>, <strong>Identity</strong>, <strong>Request context</strong>, and <strong>Cost allocation</strong>.</li>
          <li>Leave <strong>Privacy Mode</strong> off so prompts and completions are stored.</li>
        </ul>
      </li>
      <li>Click <strong>Test Connection</strong>, then save.</li>
    </ol>
    <button type="button">Go to logs</button>
  </main>
  <script>
    document.querySelector('button').addEventListener('click', async () => {
      const response = await fetch('/ready', { method: 'POST' });
      if (response.ok) location.assign('/');
    });
  </script>
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
    .steps { display: flex; gap: 8px; margin: 0 0 22px; }
    .steps span { flex: 1; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--muted); font-size: 12px; font-weight: 650; }
    .steps .current { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
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
      <span class="current">1 · Account</span>
      <span>2 · OpenRouter</span>
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
        location.assign('/');
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
