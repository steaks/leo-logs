const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Shown once after the login is created. The token is the bearer OpenRouter sends to POST /traces. */
export const gettingStartedPage = (tracesUrl: string, token: string): string => {
  const url = escapeHtml(tracesUrl);
  const secret = escapeHtml(token);
  const header = escapeHtml(JSON.stringify({ Authorization: `Bearer ${token}` }, null, 2));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect OpenRouter — Leo Logs</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 14px/1.45 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(560px, calc(100% - 32px)); padding: 28px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.03em; }
    p { margin: 0 0 16px; color: var(--muted); }
    ol { margin: 0 0 18px; padding-left: 1.2em; }
    li { margin: 0 0 8px; }
    code, pre { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 12px; }
    pre { margin: 8px 0 0; padding: 12px; overflow: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); }
    button { height: 38px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>Connect OpenRouter</h1>
    <p>This access token was created for this log file. Paste it into the webhook destination. It is shown only on this screen.</p>
    <ol>
      <li>Open <a href="https://openrouter.ai/settings/observability">Settings → Observability</a> and turn on <strong>Enable Broadcast</strong>.</li>
      <li>Edit <strong>Webhook</strong>. Set the URL to <code data-traces-url="${url}">${url}</code> and the method to <code>POST</code>.</li>
      <li>Set the headers to <pre data-token="${secret}">${header}</pre></li>
      <li>If a region picker is there, choose <strong>Global</strong>. Leave <strong>Privacy Mode</strong> off so prompts and completions are stored.</li>
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

/** The first-run setup screen, or the sign-in screen after a login exists. */
export const accessPage = (mode: 'setup' | 'login'): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${mode === 'setup' ? 'Set up Leo Logs' : 'Sign in — Leo Logs'}</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0c0c; --ink: #ececec; --muted: #8a8a8a; --line: #2a2a2a; --card: #161616; --accent: #d6f25c; --accent-ink: #1a2208; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink); font: 14px/1.45 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    main { width: min(420px, calc(100% - 32px)); padding: 28px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.03em; }
    p { margin: 0 0 18px; color: var(--muted); }
    label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; color: var(--muted); font-size: 13px; }
    input { height: 38px; font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; }
    button { height: 38px; margin-top: 6px; width: 100%; border: 0; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 650; cursor: pointer; }
    .error { min-height: 1.2em; margin: 12px 0 0; color: #ffb4b4; }
  </style>
</head>
<body>
  <main>
    <h1>${mode === 'setup' ? 'Set up Leo Logs' : 'Leo Logs'}</h1>
    <p>${mode === 'setup' ? 'Create the login for this log page. You only do this once.' : 'Sign in to the log page.'}</p>
    <form>
      <label>Username <input name="username" autocomplete="username" required></label>
      <label>Password <input name="password" type="password" autocomplete="${mode === 'setup' ? 'new-password' : 'current-password'}" required minlength="8"></label>
      <button type="submit">${mode === 'setup' ? 'Create login' : 'Sign in'}</button>
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
      const response = await fetch('${mode === 'setup' ? '/setup' : '/login'}', {
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
