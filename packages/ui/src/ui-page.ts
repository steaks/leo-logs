export const logPage = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Leo Logs</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0c0c0c;
      --sidebar: #111111;
      --ink: #ececec;
      --muted: #8a8a8a;
      --line: #2a2a2a;
      --card: #161616;
      --accent: #d6f25c;
      --accent-ink: #1a2208;
      --nav: #2c3814;
      --hover: #1c1c1c;
      --link: #c5d0ff;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      display: flex;
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.45 Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
    }
    aside {
      flex: 0 0 220px;
      padding: 22px 14px;
      background: var(--sidebar);
      border-right: 1px solid var(--line);
    }
    .brand { padding: 0 10px 18px; font-weight: 650; letter-spacing: -0.03em; }
    .side-kicker {
      margin: 0 10px 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    nav { display: flex; flex-direction: column; gap: 2px; }
    nav button {
      width: 100%;
      border: 0;
      background: transparent;
      color: #c8c8c8;
      font: inherit;
      font-weight: 550;
      text-align: left;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
    }
    nav button.active { background: var(--nav); color: var(--accent); }
    nav button:hover:not(.active) { background: var(--hover); }
    .workspace { flex: 1; min-width: 0; }
    main { width: 100%; margin: 0; padding: 28px 28px 48px; }
    .top { display: flex; flex-direction: column; align-items: stretch; gap: 14px; margin-bottom: 18px; }
    .page-head { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
    h1 { font-size: 28px; line-height: 1.15; letter-spacing: -0.03em; margin: 0; font-weight: 650; }
    .notice { margin: 0; color: var(--muted); font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 12px; }
    .back {
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--accent);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .back:hover { text-decoration: underline; }
    .controls { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; width: 100%; }
    form { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; align-items: center; margin: 0; }
    .filter-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .filter-group > .group-label { display: none; }
    label, .field { display: flex; flex: 0 1 auto; width: auto; flex-direction: column; gap: 0; min-width: 0; color: var(--muted); font-size: 13px; font-weight: 500; }
    label.choice {
      flex-direction: row;
      align-items: center;
      height: 34px;
      gap: 8px;
      padding: 0 12px;
      color: var(--ink);
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      white-space: nowrap;
    }
    input, select, .multi > button, #export {
      height: 34px;
      min-width: 0;
      font: inherit;
      color: var(--ink);
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0 12px;
    }
    select, #filter-name, .multi > button { min-width: 160px; }
    .multi { position: relative; }
    .multi > button {
      width: 180px;
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .multi-menu {
      position: absolute;
      z-index: 2;
      top: calc(100% + 6px);
      right: 0;
      min-width: max(100%, 260px);
      max-height: 240px;
      overflow: auto;
      background: #1a1a1a;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    }
    .multi-menu label {
      flex: none;
      flex-direction: row;
      align-items: center;
      width: auto;
      height: auto;
      gap: 8px;
      padding: 6px 8px;
      color: var(--ink);
      font-size: 13px;
      font-weight: 500;
      border: 0;
      background: transparent;
      border-radius: 8px;
    }
    .multi-menu label:hover { background: var(--hover); }
    .multi-menu input { width: auto; height: auto; min-width: 0; }
    #columns-button { width: auto; min-width: 0; }
    #columns-menu { max-height: min(480px, 70vh); }
    input:focus, select:focus, nav button:focus-visible, th button:focus-visible, .multi > button:focus-visible, .back:focus-visible, #export:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin: 0 0 16px;
    }
    .stats div, .stats button.stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      color: inherit;
      font: inherit;
      text-align: left;
    }
    .stats button.stat { cursor: pointer; }
    .stats button.stat:hover { border-color: #454545; }
    .stats button.stat:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .stats button.stat strong { color: var(--link); }
    .stats span { color: var(--muted); font-size: 12px; font-weight: 550; }
    .stats strong { font-size: 18px; font-weight: 650; letter-spacing: -0.02em; }
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 5;
      width: min(760px, 100%);
      height: 100vh;
      overflow: auto;
      background: #161616;
      border-left: 1px solid var(--line);
      box-shadow: -16px 0 40px rgba(0, 0, 0, 0.45);
      padding: 22px 20px 32px;
    }
    .panel h2 { margin: 0 40px 6px 0; font-size: 22px; letter-spacing: -0.03em; }
    .panel .notice { margin: 0 0 14px; }
    .panel .close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .panel .close:hover { color: var(--ink); background: var(--hover); }
    .panel .close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .panel p { margin: 0 0 14px; color: var(--muted); }
    .panel h3 { margin: 12px 0 0; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    .panel a { color: var(--link); font-weight: 600; text-decoration: none; }
    .panel a:hover { text-decoration: underline; }
    .panel .docs { margin: 0 0 12px; }
    .panel .stack { display: flex; flex-direction: column; gap: 8px; }
    .table-bar { display: flex; justify-content: flex-end; gap: 8px; margin: 0 0 8px; }
    .table-bar:not(:has(button:not([hidden]))) { display: none; }
    #export { font-weight: 600; cursor: pointer; }
    #export:hover, select:hover, input:hover, .multi > button:hover { border-color: #454545; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: transparent; }
    .table-wrap:not(:has(table:not([hidden]))) { display: none; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    th { color: var(--muted); font-size: 12px; font-weight: 550; background: transparent; }
    th button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: inherit;
      text-align: left;
      cursor: pointer;
    }
    th[aria-sort] { color: var(--accent); }
    th[aria-sort="ascending"] button::after { content: "▲"; font-size: 9px; }
    th[aria-sort="descending"] button::after { content: "▼"; font-size: 9px; }
    tr:last-child td { border-bottom: 0; }
    tbody tr { cursor: pointer; }
    tbody tr:hover td { background: var(--hover); }
    .message { background: #101010; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
    .message .role { color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .message pre { margin: 6px 0 0; padding: 0; background: transparent; color: var(--ink); font-size: 13px; }
    .count-button {
      border: 0;
      background: transparent;
      color: var(--link);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }
    .count-button:hover { text-decoration: underline; }
    tbody tr:has(td[colspan]) { cursor: default; }
    tbody tr:has(td[colspan]):hover td { background: transparent; }
    td[colspan] { color: var(--muted); }
    td a { color: var(--link); font-weight: 550; text-decoration: none; }
    td a:hover { text-decoration: underline; }
    pre {
      white-space: pre-wrap;
      margin: 14px 0 0;
      background: #101010;
      color: var(--ink);
      border: 1px solid var(--line);
      padding: 16px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.5;
    }
    .settings { max-width: 560px; }
    .settings h2 { margin: 22px 0 8px; font-size: 16px; }
    .settings p { margin: 0 0 8px; }
    .settings pre {
      margin: 0;
      padding: 12px;
      overflow: auto;
      white-space: pre-wrap;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      font-size: 12px;
    }
    .settings label { align-items: stretch; width: 100%; max-width: 360px; margin-bottom: 10px; }
    .settings input { width: 100%; }
    .settings button {
      height: 34px;
      border: 0;
      border-radius: 8px;
      background: var(--accent);
      color: var(--accent-ink);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }
    .settings .warn { color: #ffb4b4; }
    @media (max-width: 800px) {
      body { flex-direction: column; }
      aside { flex: none; border-right: 0; border-bottom: 1px solid var(--line); }
      nav { flex-direction: row; }
      nav button { width: auto; }
      main { padding: 20px 16px 40px; }
      .top { gap: 12px; }
      .controls, form { justify-content: flex-start; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <aside>
    <div class="brand">Leo Logs</div>
    <p class="side-kicker">OpenRouter</p>
    <nav>
      <button id="nav-pipelines" class="active" type="button">Pipelines</button>
      <button id="nav-agents" type="button">Agents</button>
      <button id="nav-settings" type="button">Settings</button>
    </nav>
  </aside>
  <div class="workspace">
  <main>
    <div class="top">
    <div class="page-head">
      <button id="back" class="back link" type="button" hidden></button>
      <h1 id="title">Pipelines</h1>
      <p id="notice" class="notice"></p>
    </div>
    <div id="controls" class="controls">
    <form id="filters">
      <div class="filter-group">
        <span class="group-label">Time</span>
        <label>
          <select id="filter-window" aria-label="Window">
            <option value="hour">Past hour</option>
            <option value="day">Past 24 hours</option>
            <option value="week">Past 7 days</option>
            <option value="month" selected>Past 30 days</option>
          </select>
        </label>
      </div>
      <div class="filter-group" id="filter-list">
        <span class="group-label">Rows</span>
        <label id="filter-name-field"><input id="filter-name" type="search" placeholder="Pipeline" aria-label="Name"></label>
        <label id="filter-failures-field" class="choice"><input id="filter-failures" type="checkbox"> Failures only</label>
      </div>
      <div class="filter-group">
        <span class="group-label">Models</span>
        <div class="field">
          <div class="multi" id="filter-model">
            <button id="filter-model-button" type="button">All models</button>
            <div id="filter-model-menu" class="multi-menu" hidden></div>
          </div>
        </div>
      </div>
    </form>
    </div>
    </div>
    <section id="stats" class="stats" hidden></section>
    <div id="table-bar" class="table-bar">
      <div class="multi" id="columns">
        <button id="columns-button" type="button" hidden>Columns</button>
        <div id="columns-menu" class="multi-menu" hidden></div>
      </div>
      <button id="export" type="button" hidden>Export CSV</button>
    </div>
    <div class="table-wrap">
      <table id="summary">
        <thead></thead>
        <tbody></tbody>
      </table>
      <table id="calls" hidden>
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
    <div id="detail"></div>
    <section id="settings" class="settings" hidden>
      <h2>Account</h2>
      <p id="settings-username"></p>
      <h2>OpenRouter webhook</h2>
      <p>POST traces to this URL. The header is the access token.</p>
      <p id="settings-url" class="notice"></p>
      <pre id="settings-token"></pre>
      <form id="settings-password">
        <h2>Password</h2>
        <label>Current password <input name="current" type="password" autocomplete="current-password" required></label>
        <label>New password <input name="password" type="password" autocomplete="new-password" required minlength="8"></label>
        <button type="submit">Change password</button>
        <p id="settings-password-message" class="warn"></p>
      </form>
    </section>
  </main>
  <aside id="messages-panel" class="panel" hidden role="dialog" aria-modal="true" aria-labelledby="messages-title">
    <button id="messages-close" class="close" type="button" aria-label="Close">×</button>
    <h2 id="messages-title">Messages</h2>
    <div id="messages-list" class="stack"></div>
  </aside>
  <aside id="call-panel" class="panel" hidden role="dialog" aria-modal="true" aria-labelledby="call-title">
    <button id="call-close" class="close" type="button" aria-label="Close">×</button>
    <h2 id="call-title">Function call</h2>
    <div id="call-list" class="stack"></div>
  </aside>
  <aside id="agents-panel" class="panel" hidden role="dialog" aria-modal="true" aria-labelledby="agents-title">
    <button id="agents-close" class="close" type="button" aria-label="Close">×</button>
    <h2 id="agents-title">Agents</h2>
    <p id="agents-notice" class="notice"></p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Key</th>
            <th>Executions</th>
            <th>Failures</th>
            <th>Avg latency</th>
            <th>Avg cost</th>
          </tr>
        </thead>
        <tbody id="agents-body"></tbody>
      </table>
    </div>
  </aside>
  </div>
  <script>
    const title = document.getElementById('title');
    const notice = document.getElementById('notice');
    const back = document.getElementById('back');
    const summary = document.getElementById('summary');
    const summaryHead = summary.querySelector('thead');
    const summaryBody = summary.querySelector('tbody');
    const calls = document.getElementById('calls');
    const callsHead = calls.querySelector('thead');
    const callsBody = calls.querySelector('tbody');
    const detail = document.getElementById('detail');
    const stats = document.getElementById('stats');
    const navPipelines = document.getElementById('nav-pipelines');
    const navAgents = document.getElementById('nav-agents');
    const navSettings = document.getElementById('nav-settings');
    const controls = document.getElementById('controls');
    const tableBar = document.getElementById('table-bar');
    const settings = document.getElementById('settings');
    const settingsUsername = document.getElementById('settings-username');
    const settingsUrl = document.getElementById('settings-url');
    const settingsToken = document.getElementById('settings-token');
    const settingsPassword = document.getElementById('settings-password');
    const settingsPasswordMessage = document.getElementById('settings-password-message');
    const filters = document.getElementById('filters');
    const filterWindow = document.getElementById('filter-window');
    const filterList = document.getElementById('filter-list');
    const filterNameField = document.getElementById('filter-name-field');
    const filterName = document.getElementById('filter-name');
    const filterFailuresField = document.getElementById('filter-failures-field');
    const filterFailures = document.getElementById('filter-failures');
    const filterModel = document.getElementById('filter-model');
    const filterModelButton = document.getElementById('filter-model-button');
    const filterModelMenu = document.getElementById('filter-model-menu');
    const columnsPicker = document.getElementById('columns');
    const columnsButton = document.getElementById('columns-button');
    const columnsMenu = document.getElementById('columns-menu');
    const exportButton = document.getElementById('export');
    const messagesPanel = document.getElementById('messages-panel');
    const messagesList = document.getElementById('messages-list');
    const messagesClose = document.getElementById('messages-close');
    const callPanel = document.getElementById('call-panel');
    const callTitle = document.getElementById('call-title');
    const callList = document.getElementById('call-list');
    const callClose = document.getElementById('call-close');
    const agentsPanel = document.getElementById('agents-panel');
    const agentsTitle = document.getElementById('agents-title');
    const agentsNotice = document.getElementById('agents-notice');
    const agentsBody = document.getElementById('agents-body');
    const agentsClose = document.getElementById('agents-close');
    let catalogData = null;
    let current = () => {};
    let fillingModels = false;

    const money = (value) => '$' + Number(value || 0).toFixed(4);
    const tokenCount = (value) => Number(value || 0).toLocaleString();
    const tokenSums = (rows) => {
      let input = 0;
      let output = 0;
      for (const row of rows || []) {
        input += Number(row.promptTokens || 0);
        output += Number(row.completionTokens || 0);
      }
      return { input, output };
    };
    const when = (value) => value ? new Date(value).toLocaleString() : '';
    const duration = (value) => value == null ? '' : Math.round(value) + ' ms';
    const shortId = (id) => (id || '').slice(0, 8);
    const keys = (value) => Array.isArray(value) ? value.filter(Boolean).join(', ') : (value || '');
    const pageId = (value) => {
      const text = String(value || '');
      if (!text) return false;
      for (const char of text) {
        if ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:/@+-'.indexOf(char) < 0) return false;
      }
      return true;
    };
    let providerSlugs = {};
    const rememberProviders = (map) => {
      providerSlugs = {};
      for (const [name, slug] of Object.entries(map || {})) providerSlugs[name.toLowerCase()] = slug;
      for (const slug of Object.values(providerSlugs)) providerSlugs[String(slug).toLowerCase()] = slug;
    };
    const modelLinks = (value) => {
      const ids = Array.isArray(value) ? value : (value ? [value] : []);
      const links = [];
      for (const id of ids) {
        const model = String(id || '').trim();
        if (!pageId(model)) continue;
        links.push({ text: model, href: 'https://openrouter.ai/' + model.split('/').map((part) => encodeURIComponent(part)).join('/') });
      }
      return { links };
    };
    const providerLink = (name) => {
      const text = name || '';
      if (!text) return '';
      const slug = providerSlugs[text.toLowerCase()] || '';
      if (!pageId(slug) || slug.includes('/')) return text;
      return { links: [{ text, href: 'https://openrouter.ai/provider/' + encodeURIComponent(slug) }] };
    };
    const latencyOf = (item) => item.durationSamples ? item.durationMs / item.durationSamples : null;
    const percentile = (values, p) => {
      const sorted = [...values].sort((left, right) => left - right);
      if (sorted.length <= 1) return sorted[0] ?? 0;
      const rank = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      if (lower === upper) return sorted[lower] ?? 0;
      const left = sorted[lower] ?? 0;
      const right = sorted[upper] ?? left;
      return left + (right - left) * (rank - lower);
    };
    const spanMs = (item) => {
      const start = Date.parse(item && item.started || '');
      const end = Date.parse(item && item.ended || '');
      if (!item || !item.started || !item.ended || Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
      return end - start;
    };
    const windowLabel = () => ({
      hour: 'the last hour',
      day: 'the last 24 hours',
      week: 'the last 7 days',
      month: 'the last 30 days',
    })[filterWindow.value] || 'the last 30 days';
    const matchesName = (...values) => {
      if (filterNameField.hidden) return true;
      const needle = filterName.value.trim().toLowerCase();
      if (!needle) return true;
      return values.some((value) => String(value || '').toLowerCase().includes(needle));
    };
    const matchesFailures = (count) => filterFailuresField.hidden || !filterFailures.checked || Number(count) > 0;
    let nameKind = 'pipelines';
    const arrangeFilters = (kind) => {
      const usesName = kind === 'pipelines' || kind === 'agents' || kind === 'calls';
      if (usesName && nameKind !== kind) filterName.value = '';
      if (usesName) nameKind = kind;
      filterNameField.hidden = !usesName;
      filterFailuresField.hidden = false;
      filterName.placeholder = kind === 'pipelines' ? 'Pipeline' : kind === 'agents' ? 'Agent or pipeline' : 'Agent';
      filterList.hidden = filterNameField.hidden && filterFailuresField.hidden;
    };
    const selectedModels = () => [...filterModelMenu.querySelectorAll('input:checked')].map((input) => input.value);
    const modelLabel = () => {
      const selected = selectedModels();
      if (!selected.length) return 'All models';
      if (selected.length === 1) return selected[0];
      return selected.length + ' models';
    };
    const queryString = () => {
      const params = new URLSearchParams();
      params.set('window', filterWindow.value);
      for (const model of selectedModels()) params.append('model', model);
      return params.toString();
    };
    let suppressHistory = false;
    let applyUrlModels = false;
    let urlModels = [];
    const routeFromLocation = () => {
      const params = new URLSearchParams(location.search);
      const path = location.pathname;
      if (path === '/settings') return { page: 'settings' };
      if (path !== '/' && path !== '/sessions' && path !== '/session' && path !== '/agents' && path !== '/executions' && path !== '/execution') return null;
      const pipeline = params.get('pipeline');
      const agent = params.get('agent');
      const session = params.get('session');
      const execution = params.get('execution');
      const agentsView = path === '/agents' || path === '/executions' || path === '/execution' || params.get('view') === 'agents';
      if (agentsView) {
        if (agent && execution && path !== '/executions') return { page: 'agent-execution', name: agent, pipelineName: pipeline, traceId: execution };
        if (agent && path !== '/execution') return { page: 'agent', name: agent, pipelineName: pipeline };
        if (path === '/executions' || path === '/execution') return null;
        return { page: 'agents' };
      }
      if (params.get('view')) return null;
      if ((path === '/session' || path === '/') && pipeline && session) return { page: 'session', name: pipeline, traceId: session };
      if ((path === '/sessions' || path === '/') && pipeline) return { page: 'pipeline', name: pipeline };
      if (path === '/sessions' || path === '/session') return null;
      if (session || agent || execution) return null;
      return { page: 'pipelines' };
    };
    const addressFor = (route) => {
      if (route.page === 'settings') return '/settings';
      const params = new URLSearchParams();
      const path = route.page === 'agents' ? '/agents'
        : route.page === 'agent' ? '/executions'
        : route.page === 'agent-execution' ? '/execution'
        : route.page === 'pipeline' ? '/sessions'
        : route.page === 'session' ? '/session'
        : '/';
      if (route.page === 'pipeline' || route.page === 'session') params.set('pipeline', route.name);
      if (route.page === 'session') params.set('session', route.traceId);
      if (route.page === 'agent' || route.page === 'agent-execution') {
        params.set('agent', route.name);
        if (route.pipelineName) params.set('pipeline', route.pipelineName);
      }
      if (route.page === 'agent-execution') params.set('execution', route.traceId);
      if (filterWindow.value !== 'month') params.set('window', filterWindow.value);
      for (const model of selectedModels()) params.append('model', model);
      if (!filterNameField.hidden && filterName.value.trim()) params.set('q', filterName.value.trim());
      if (filterFailures.checked) params.set('failures', '1');
      const search = params.toString();
      return path + (search ? '?' + search : '');
    };
    const writeRoute = (route) => {
      const next = addressFor(route);
      if (location.pathname + location.search === next || suppressHistory) return;
      history.pushState(null, '', next);
    };
    const replaceFilters = () => {
      const next = addressFor(routeFromLocation() || { page: 'pipelines' });
      if (location.pathname + location.search === next) return;
      history.replaceState(null, '', next);
    };
    const readFilters = () => {
      const params = new URLSearchParams(location.search);
      const window = params.get('window');
      filterWindow.value = window === 'hour' || window === 'day' || window === 'week' || window === 'month' ? window : 'month';
      filterFailures.checked = params.get('failures') === '1';
      filterName.value = params.get('q') || '';
      urlModels = params.getAll('model');
      applyUrlModels = true;
    };
    const filterKind = (page) => page === 'session' ? 'calls' : page === 'agent-execution' ? 'agent-calls' : page === 'pipelines' || page === 'agents' ? page : 'executions';
    const rowsUrl = (scope, traceId) => '/api/rows?scope=' + scope + '&traceId=' + encodeURIComponent(traceId) + '&' + queryString();

    const setNav = (page) => {
      navPipelines.classList.toggle('active', page === 'pipelines');
      navAgents.classList.toggle('active', page === 'agents');
      navSettings.classList.toggle('active', page === 'settings');
    };
    const showLogChrome = () => {
      settings.hidden = true;
      controls.hidden = false;
      tableBar.hidden = false;
    };

    const cellText = (value) => {
      if (value && typeof value === 'object' && Array.isArray(value.links)) return value.links.map((link) => link.text).join(', ');
      if (value && typeof value === 'object' && Array.isArray(value.buttons)) return value.buttons.map((button) => button.text).join(', ');
      if (value && typeof value === 'object' && value.text != null) return String(value.text);
      return String(value ?? '');
    };
    const linkCell = (td, value) => {
      value.links.forEach((link, index) => {
        if (index) td.append(document.createTextNode(', '));
        const anchor = document.createElement('a');
        anchor.href = link.href;
        anchor.textContent = link.text;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.addEventListener('click', (event) => event.stopPropagation());
        td.append(anchor);
      });
    };
    const buttonCell = (td, value) => {
      value.buttons.forEach((action, index) => {
        if (index) td.append(document.createTextNode(', '));
        td.append(actionButton(action));
      });
    };
    const actionButton = (action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.className || '';
      button.textContent = action.text;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        action.onClick();
      });
      return button;
    };
    const fill = (tableBody, rows, columns, onClick) => {
      tableBody.replaceChildren();
      for (const row of rows) {
        const tr = document.createElement('tr');
        for (const value of columns(row)) {
          const td = document.createElement('td');
          if (value && typeof value === 'object' && Array.isArray(value.links)) linkCell(td, value);
          else if (value && typeof value === 'object' && Array.isArray(value.buttons)) buttonCell(td, value);
          else if (value && typeof value === 'object' && value.text != null) td.append(actionButton(value));
          else td.textContent = value;
          tr.append(td);
        }
        if (onClick) tr.addEventListener('click', () => onClick(row));
        tableBody.append(tr);
      }
    };

    const numberOfCell = (text) => {
      let cleaned = text.split('$').join('').split(',').join('');
      if (cleaned.endsWith(' ms')) cleaned = cleaned.slice(0, -3);
      if (cleaned === '' || Number.isNaN(Number(cleaned))) return null;
      for (const char of cleaned) {
        if ('0123456789.-+'.indexOf(char) < 0) return null;
      }
      return Number(cleaned);
    };
    const compareCells = (left, right) => {
      const a = cellText(left).trim();
      const b = cellText(right).trim();
      const an = numberOfCell(a);
      const bn = numberOfCell(b);
      if (an != null && bn != null) return an - bn;
      const ad = Date.parse(a);
      const bd = Date.parse(b);
      if (a && b && !Number.isNaN(ad) && !Number.isNaN(bd)) return ad - bd;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    };
    let view = null;
    let sortState = { key: '', index: -1, direction: 1 };
    const columnKey = (labels) => 'leo-logs-columns:' + labels.join('|');
    const defaultHiddenLabels = ['P50 cost', 'P75 cost', 'P90 cost', 'P95 cost'];
    const defaultHiddenPairs = [['Avg latency', 'Avg model time'], ['Latency', 'Model time']];
    const defaultHidden = (labels) => {
      const hidden = defaultHiddenLabels.filter((label) => labels.includes(label));
      for (const pair of defaultHiddenPairs) {
        if (pair.every((label) => labels.includes(label))) hidden.push(...pair);
      }
      return hidden;
    };
    const hiddenColumns = (labels) => {
      const raw = localStorage.getItem(columnKey(labels));
      if (raw == null) return new Set(defaultHidden(labels));
      let stored = [];
      try { stored = JSON.parse(raw); } catch { stored = []; }
      const hidden = new Set(Array.isArray(stored) ? stored.filter((label) => labels.includes(label)) : []);
      if (hidden.size >= labels.length) hidden.clear();
      return hidden;
    };
    const saveHidden = (labels, hidden) => {
      localStorage.setItem(columnKey(labels), JSON.stringify([...hidden]));
    };
    const columnLabel = (hidden) => hidden.size ? hidden.size + ' hidden' : 'Columns';
    const visibleIndexes = () => {
      const hidden = hiddenColumns(view.labels);
      return view.labels.map((_, index) => index).filter((index) => !hidden.has(view.labels[index]));
    };
    const syncColumnsMenu = () => {
      const hidden = hiddenColumns(view.labels);
      const same = columnsMenu.dataset.key === view.key && columnsMenu.childElementCount === view.labels.length;
      if (!same) {
        columnsMenu.dataset.key = view.key;
        columnsMenu.replaceChildren();
        for (const label of view.labels) {
          const option = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = label;
          input.checked = !hidden.has(label);
          input.addEventListener('change', () => {
            const next = hiddenColumns(view.labels);
            if (input.checked) next.delete(label);
            else if (view.labels.filter((item) => !next.has(item)).length <= 1) {
              input.checked = true;
              return;
            } else next.add(label);
            saveHidden(view.labels, next);
            columnsButton.textContent = columnLabel(next);
            paint();
          });
          option.append(input, document.createTextNode(' ' + label));
          columnsMenu.append(option);
        }
      } else {
        for (const input of columnsMenu.querySelectorAll('input')) input.checked = !hidden.has(input.value);
      }
      columnsButton.textContent = columnLabel(hidden);
      columnsButton.setAttribute('aria-expanded', columnsMenu.hidden ? 'false' : 'true');
    };
    const showTable = (head, body, labels, rows, columns, onClick, emptyText) => {
      const key = (head === summaryHead ? 'summary' : 'calls') + ':' + labels.join('|');
      view = { key, head, body, labels, rows, columns, onClick, emptyText };
      if (sortState.key !== key) sortState = { key, index: -1, direction: 1 };
      paint();
    };
    const paint = () => {
      syncColumnsMenu();
      const indexes = visibleIndexes();
      const headRow = document.createElement('tr');
      for (const index of indexes) {
        const th = document.createElement('th');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = view.labels[index];
        button.addEventListener('click', () => {
          const direction = sortState.index === index ? sortState.direction * -1 : 1;
          sortState = { key: view.key, index, direction };
          paint();
        });
        if (sortState.index === index) th.setAttribute('aria-sort', sortState.direction > 0 ? 'ascending' : 'descending');
        th.append(button);
        headRow.append(th);
      }
      view.head.replaceChildren(headRow);
      const sorted = [...view.rows];
      if (sortState.index >= 0) {
        const index = sortState.index;
        const direction = sortState.direction;
        sorted.sort((left, right) => direction * compareCells(view.columns(left)[index], view.columns(right)[index]));
      }
      fill(view.body, sorted, (row) => indexes.map((index) => view.columns(row)[index]), view.onClick);
      if (!sorted.length) emptyRow(view.body, indexes.length, view.emptyText);
    };

    const csvCell = (value) => {
      const text = String(value ?? '');
      if (/[",\\n]/.test(text)) return '"' + text.replaceAll('"', '""') + '"';
      return text;
    };

    const tableCsv = (table) => {
      const lines = [];
      for (const row of table.querySelectorAll('tr')) {
        const cells = [...row.children];
        if (cells.length === 1 && cells[0].colSpan > 1) continue;
        lines.push(cells.map((cell) => csvCell(cell.textContent)).join(','));
      }
      return String.fromCharCode(65279) + lines.join('\\n') + '\\n';
    };

    const exportTable = () => {
      const table = calls.hidden ? summary : calls;
      const blob = new Blob([tableCsv(table)], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      const page = (title.textContent || 'logs').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logs';
      link.href = URL.createObjectURL(blob);
      link.download = page + '-' + filterWindow.value + '.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    const emptyRow = (tableBody, span, text) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = span;
      td.textContent = text;
      tr.append(td);
      tableBody.append(tr);
    };

    const hideStats = () => {
      stats.hidden = true;
      stats.replaceChildren();
    };

    const showStats = (items) => {
      stats.hidden = false;
      stats.replaceChildren();
      for (const item of items) {
        const card = document.createElement(item.onClick ? 'button' : 'div');
        if (item.onClick) {
          card.type = 'button';
          card.className = 'stat';
          card.addEventListener('click', (event) => {
            event.stopPropagation();
            item.onClick();
          });
        }
        const label = document.createElement('span');
        label.textContent = item.label;
        const value = document.createElement('strong');
        value.textContent = item.value;
        card.append(label, value);
        stats.append(card);
      }
    };
    const sidePanels = [agentsPanel, messagesPanel, callPanel];
    const closePanels = () => {
      for (const panel of sidePanels) panel.hidden = true;
    };
    const openPanel = (panel) => {
      for (const item of sidePanels) item.hidden = item !== panel;
      panel.hidden = false;
      panel.querySelector('.close').focus();
    };
    const agentsFor = (name, names) => {
      const allowed = names ? new Set(names) : null;
      return ((catalogData && catalogData.agentOverviews) || []).filter((item) => item.pipelineName === name && (!allowed || allowed.has(item.name)));
    };
    const openAgents = (name, names) => {
      const rows = agentsFor(name, names);
      agentsTitle.textContent = 'Agents';
      agentsNotice.textContent = name;
      agentsBody.replaceChildren();
      if (!rows.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = 'No agents in this pipeline.';
        tr.append(td);
        agentsBody.append(tr);
      }
      for (const agent of rows) {
        const tr = document.createElement('tr');
        for (const value of [agent.name, keys(agent.keyNames), String(agent.executions), String(agent.failures || 0), duration(agent.averageLatencyMs), money(agent.averageCost)]) {
          const td = document.createElement('td');
          td.textContent = value;
          tr.append(td);
        }
        tr.addEventListener('click', () => {
          closePanels();
          showAgent(agent);
        });
        agentsBody.append(tr);
      }
      openPanel(agentsPanel);
    };

    const showSummary = () => {
      showLogChrome();
      summary.hidden = false;
      calls.hidden = true;
      hideStats();
      detail.replaceChildren();
      callsBody.replaceChildren();
    };

    const showPipelines = () => {
      current = showPipelines;
      writeRoute({ page: 'pipelines' });
      setNav('pipelines');
      back.hidden = true;
      arrangeFilters('pipelines');
      title.textContent = 'Pipelines';
      notice.textContent = '';
      showSummary();
      const rows = ((catalogData && catalogData.overviews) || []).filter((item) => matchesName(item.name) && matchesFailures(item.failures));
      showTable(summaryHead, summaryBody, ['Pipeline', 'Key', 'Models', 'Sessions', 'Agents', 'Failures', 'Input tokens', 'Output tokens', 'Cached tokens', 'Total cost', 'Avg latency', 'Avg model time', 'Avg cost', 'P50 cost', 'P75 cost', 'P90 cost', 'P95 cost'], rows, (item) => [
        item.name,
        keys(item.keyNames),
        modelLinks(item.models),
        String(item.executions),
        item.agents ? { text: String(item.agents), className: 'count-button', onClick: () => openAgents(item.name) } : '0',
        String(item.failures),
        tokenCount(item.inputTokens),
        tokenCount(item.outputTokens),
        tokenCount(item.cachedTokens),
        money(item.totalCost),
        duration(item.averageLatencyMs),
        duration(item.averageModelTimeMs),
        money(item.averageCost),
        money(item.costP50),
        money(item.costP75),
        money(item.costP90),
        money(item.costP95),
      ], showExecutions, 'No pipelines in ' + windowLabel() + '.');
    };

    const showExecutions = (overview) => {
      current = () => showExecutions(overview);
      writeRoute({ page: 'pipeline', name: overview.name });
      setNav('pipelines');
      back.hidden = false;
      back.textContent = 'Pipelines';
      back.onclick = showPipelines;
      arrangeFilters('executions');
      title.textContent = overview.name;
      notice.textContent = 'Sessions';
      showSummary();
      const rows = ((catalogData && catalogData.pipelines) || []).filter((item) => item.name === overview.name && matchesFailures(item.failures));
      const calls = rows.reduce((sum, item) => sum + Number(item.calls || 0), 0);
      const failures = rows.reduce((sum, item) => sum + Number(item.failures || 0), 0);
      const inputTokens = rows.reduce((sum, item) => sum + Number(item.promptTokens || 0), 0);
      const outputTokens = rows.reduce((sum, item) => sum + Number(item.completionTokens || 0), 0);
      const cachedTokens = rows.reduce((sum, item) => sum + Number(item.cachedTokens || 0), 0);
      const cost = rows.reduce((sum, item) => sum + Number(item.cost || 0), 0);
      const timed = rows.filter((item) => Number(item.durationSamples) > 0);
      const durationMs = timed.reduce((sum, item) => sum + Number(item.durationMs || 0), 0);
      const latencies = rows.map(spanMs).filter((value) => value != null);
      const agents = new Set(rows.flatMap((item) => (item.agents || []).map((agent) => agent.name)));
      showStats([
        { label: 'Sessions', value: String(rows.length) },
        { label: 'Calls', value: String(calls) },
        { label: 'Agents', value: String(agents.size), onClick: agents.size ? () => openAgents(overview.name, agents) : null },
        { label: 'Failures', value: String(failures) },
        { label: 'Input tokens', value: tokenCount(inputTokens) },
        { label: 'Output tokens', value: tokenCount(outputTokens) },
        { label: 'Cached tokens', value: tokenCount(cachedTokens) },
        { label: 'Total cost', value: money(cost) },
        { label: 'Avg latency', value: duration(latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : null) },
        { label: 'Avg model time', value: duration(timed.length ? durationMs / timed.length : null) },
        { label: 'Avg cost', value: money(rows.length ? cost / rows.length : 0) },
        { label: 'P50 cost', value: money(percentile(rows.map((item) => Number(item.cost || 0)), 50)) },
        { label: 'P75 cost', value: money(percentile(rows.map((item) => Number(item.cost || 0)), 75)) },
        { label: 'P90 cost', value: money(percentile(rows.map((item) => Number(item.cost || 0)), 90)) },
        { label: 'P95 cost', value: money(percentile(rows.map((item) => Number(item.cost || 0)), 95)) },
      ]);
      showTable(summaryHead, summaryBody, ['Session', 'Key', 'Models', 'Calls', 'Latency', 'Model time', 'Cost', 'Latest'], rows, (item) => [shortId(item.id), keys(item.apiKeyNames), modelLinks(item.models), String(item.calls), duration(spanMs(item)), duration(Number(item.durationSamples) > 0 ? item.durationMs : null), money(item.cost), when(item.latest)], showExecution, 'No sessions in ' + windowLabel() + '.');
    };

    const showExecution = async (execution) => {
      current = () => showExecution(execution);
      writeRoute({ page: 'session', name: execution.name, traceId: execution.traceId });
      setNav('pipelines');
      back.hidden = false;
      back.textContent = execution.name;
      back.onclick = () => showExecutions({ name: execution.name });
      arrangeFilters('calls');
      title.textContent = 'Pipeline session';
      notice.textContent = execution.traceId;
      showLogChrome();
      summary.hidden = true;
      calls.hidden = false;
      detail.replaceChildren();
      callsBody.replaceChildren();
      const currentExecution = ((catalogData && catalogData.pipelines) || []).find((item) => item.traceId === execution.traceId) || execution;
      const callCount = Number(currentExecution.calls || 0);
      const sessionStats = (tokens) => showStats([
        { label: 'Calls', value: String(callCount) },
        { label: 'Agents', value: String((currentExecution.agents || []).length) },
        { label: 'Failures', value: String(currentExecution.failures || 0) },
        { label: 'Input tokens', value: tokenCount(tokens.input) },
        { label: 'Output tokens', value: tokenCount(tokens.output) },
        { label: 'Total cost', value: money(currentExecution.cost) },
        { label: 'Latency', value: duration(spanMs(currentExecution)) },
        { label: 'Model time', value: duration(Number(currentExecution.durationSamples) > 0 ? currentExecution.durationMs : null) },
        { label: 'Avg cost', value: money(callCount ? Number(currentExecution.cost || 0) / callCount : 0) },
      ]);
      sessionStats({ input: 0, output: 0 });
      const response = await fetch(rowsUrl('pipeline', execution.traceId));
      const payload = await response.json();
      if (!response.ok) {
        notice.textContent = payload.error || 'Could not load this session.';
        return;
      }
      const agentCalls = (payload.rows || []).filter((row) => (row.agentName || row.sessionId === execution.traceId) && matchesName(row.agentName) && matchesFailures(row.status === 'error' ? 1 : 0));
      const callsOf = listedCalls(payload.rows || []);
      sessionStats(tokenSums(payload.rows));
      showTable(callsHead, callsBody, ['Time', 'Agent', 'Key', 'Status', 'Turn', 'Latency', 'Input', 'Output', 'Messages', 'Cost', 'Model', 'Provider', 'Functions', 'Server'], agentCalls, (row) => {
        const calls = callsOf.get(row) || callLists(row);
        return [
          when(row.timestamp),
          row.agentName || '',
          row.apiKeyName || '',
          row.status || '',
          turnLabel(row),
          duration(row.durationMs),
          tokenCount(row.promptTokens),
          tokenCount(row.completionTokens),
          messagesButton(row),
          money(row.totalCost),
          modelLinks(row.model),
          providerLink(row.providerName),
          functionButtons(calls),
          serverButtons(calls),
        ];
      }, showDetail, 'No agent calls in this session.');
    };

    const showSettings = async () => {
      current = showSettings;
      writeRoute({ page: 'settings' });
      setNav('settings');
      back.hidden = true;
      title.textContent = 'Settings';
      notice.textContent = '';
      settings.hidden = false;
      controls.hidden = true;
      tableBar.hidden = true;
      summary.hidden = true;
      calls.hidden = true;
      hideStats();
      detail.replaceChildren();
      settingsPasswordMessage.textContent = '';
      const response = await fetch('/api/settings');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notice.textContent = payload.error || 'Settings are unavailable';
        return;
      }
      settingsUsername.textContent = payload.username || '';
      settingsUrl.textContent = payload.tracesUrl || '';
      settingsToken.textContent = payload.token ? 'Authorization: Bearer ' + payload.token : '';
      settingsPassword.hidden = !payload.canChangePassword;
    };

    const showAgents = () => {
      current = showAgents;
      writeRoute({ page: 'agents' });
      setNav('agents');
      back.hidden = true;
      arrangeFilters('agents');
      title.textContent = 'Agents';
      notice.textContent = '';
      showSummary();
      const rows = ((catalogData && catalogData.agentOverviews) || []).filter((item) => matchesName(item.name, item.pipelineName) && matchesFailures(item.failures));
      showTable(summaryHead, summaryBody, ['Agent', 'Pipeline', 'Key', 'Executions', 'Avg latency', 'Avg cost'], rows, (item) => [item.name, item.pipelineName || '', keys(item.keyNames), String(item.executions), duration(item.averageLatencyMs), money(item.averageCost)], showAgent, 'No agents in ' + windowLabel() + '.');
    };

    const executionsOf = (overview) => {
      if (overview.pipelineName) {
        return ((catalogData && catalogData.pipelines) || []).flatMap((pipeline) => (
          pipeline.name === overview.pipelineName
            ? pipeline.agents.filter((agent) => agent.name === overview.name).map((agent) => ({ ...agent, pipelineExecutionId: pipeline.id }))
            : []
        ));
      }
      return ((catalogData && catalogData.agents) || [])
        .filter((agent) => agent.name === overview.name)
        .map((agent) => ({ ...agent, pipelineExecutionId: null }));
    };

    const showAgent = (overview) => {
      current = () => showAgent(overview);
      writeRoute({ page: 'agent', name: overview.name, pipelineName: overview.pipelineName || null });
      setNav('agents');
      back.hidden = false;
      back.textContent = 'Agents';
      back.onclick = showAgents;
      arrangeFilters('executions');
      title.textContent = overview.name;
      notice.textContent = overview.pipelineName || 'Called on its own';
      showSummary();
      const rows = executionsOf(overview).filter((item) => matchesFailures(item.failures));
      showTable(summaryHead, summaryBody, ['Execution', 'Pipeline session', 'Key', 'Calls', 'Latency', 'Cost', 'Latest'], rows, (item) => [
        shortId(item.id),
        shortId(item.pipelineExecutionId),
        keys(item.apiKeyNames),
        String(item.calls),
        duration(latencyOf(item)),
        money(item.cost),
        when(item.latest),
      ], (item) => showAgentExecution(overview, item), 'No executions in ' + windowLabel() + '.');
    };

    const showAgentExecution = async (overview, execution) => {
      current = () => showAgentExecution(overview, execution);
      writeRoute({ page: 'agent-execution', name: overview.name, pipelineName: overview.pipelineName || null, traceId: execution.traceId });
      setNav('agents');
      back.hidden = false;
      back.textContent = overview.name;
      back.onclick = () => showAgent(overview);
      arrangeFilters('agent-calls');
      title.textContent = 'Agent execution';
      notice.textContent = execution.traceId;
      showLogChrome();
      summary.hidden = true;
      calls.hidden = false;
      detail.replaceChildren();
      callsBody.replaceChildren();
      const response = await fetch(rowsUrl('agent', execution.traceId));
      const payload = await response.json();
      if (!response.ok) {
        notice.textContent = payload.error || 'Could not load this execution.';
        return;
      }
      const agentCalls = (payload.rows || []).filter((row) => matchesFailures(row.status === 'error' ? 1 : 0));
      const callsOf = listedCalls(payload.rows || []);
      const tokens = tokenSums(payload.rows);
      const cost = (payload.rows || []).reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
      showStats([
        { label: 'Calls', value: String((payload.rows || []).length) },
        { label: 'Input tokens', value: tokenCount(tokens.input) },
        { label: 'Output tokens', value: tokenCount(tokens.output) },
        { label: 'Total cost', value: money(cost) },
      ]);
      showTable(callsHead, callsBody, ['Time', 'Key', 'Status', 'Turn', 'Latency', 'Input', 'Output', 'Messages', 'Cost', 'Model', 'Functions', 'Server'], agentCalls, (row) => {
        const calls = callsOf.get(row) || callLists(row);
        return [
          when(row.timestamp),
          row.apiKeyName || '',
          row.status || '',
          turnLabel(row),
          duration(row.durationMs),
          tokenCount(row.promptTokens),
          tokenCount(row.completionTokens),
          messagesButton(row),
          money(row.totalCost),
          modelLinks(row.model),
          functionButtons(calls),
          serverButtons(calls),
        ];
      }, showDetail, 'No calls in this execution.');
    };

    const inputMessages = (value) => {
      const data = parsed(value);
      return data && Array.isArray(data.messages) ? data.messages : [];
    };
    const toolResultMessage = (message) => {
      if (!message || typeof message !== 'object') return false;
      if (message.role === 'tool') return true;
      return Boolean(message.toolCallId || message.tool_call_id);
    };
    const turnLabel = (row) => {
      const messages = inputMessages(row.input);
      const parts = [];
      if (toolResultMessage(messages[messages.length - 1])) parts.push('Function result');
      if (row.finishReason === 'tool_calls') parts.push('Function call');
      else if (row.finishReason === 'stop') parts.push('Chat result');
      return parts.join(', ');
    };
    const messageCount = (value) => {
      const data = parsed(value);
      if (data && Array.isArray(data.messages)) return String(data.messages.length);
      return '';
    };
    const formatted = (value) => {
      if (value == null) return '';
      if (typeof value === 'string') {
        const text = value.trim();
        const first = text[0];
        if (first !== '{' && first !== '[') return value;
        try { return JSON.stringify(pretty(JSON.parse(text)), null, 2); } catch { return value; }
      }
      return JSON.stringify(pretty(value), null, 2);
    };
    const messageText = (content) => {
      if (content == null) return '';
      if (typeof content === 'string') return formatted(content);
      if (Array.isArray(content)) {
        return content.map((part) => {
          if (typeof part === 'string') return formatted(part);
          if (!part || typeof part !== 'object') return '';
          if (typeof part.text === 'string') return formatted(part.text);
          if (typeof part.content === 'string') return formatted(part.content);
          if (part.type === 'image_url' || part.type === 'image') return '[image]';
          return formatted(part);
        }).filter(Boolean).join('\\n');
      }
      return formatted(content);
    };
    const serverToolName = (name, type) => {
      if (typeof type === 'string' && type.startsWith('openrouter:')) return type;
      if (typeof name === 'string' && name.startsWith('openrouter:')) return name;
      if (typeof name === 'string' && name.startsWith('openrouter_')) return 'openrouter:' + name.slice('openrouter_'.length);
      if (type === 'reasoning.server_tool_call') return name || 'server';
      return '';
    };
    const toolCallText = (message) => {
      const calls = message.toolCalls || message.tool_calls;
      if (!Array.isArray(calls)) return '';
      return calls.map((call) => {
        const name = call?.function?.name || call?.name || 'tool';
        const server = serverToolName(name, call?.type);
        const label = server ? 'Server call ' + server : name;
        const args = call?.function?.arguments ?? call?.arguments ?? '';
        const shown = formatted(args);
        return shown ? label + '\\n' + shown : label;
      }).join('\\n\\n');
    };
    const openMessages = (row) => {
      messagesList.replaceChildren();
      const groups = [['Request', parsed(row.input)], ['Response', parsed(row.output)]];
      let any = false;
      for (const [label, data] of groups) {
        const messages = data && Array.isArray(data.messages) ? data.messages : [];
        if (!messages.length) continue;
        any = true;
        const heading = document.createElement('h3');
        heading.textContent = label;
        messagesList.append(heading);
        for (const message of messages) {
          const card = document.createElement('article');
          card.className = 'message';
          const role = document.createElement('div');
          role.className = 'role';
          role.textContent = message.role || 'message';
          card.append(role);
          const text = [messageText(message.content), toolCallText(message)].filter(Boolean).join('\\n\\n');
          if (text) {
            const body = document.createElement('pre');
            body.textContent = text;
            card.append(body);
          }
          messagesList.append(card);
        }
      }
      if (!any) {
        const empty = document.createElement('p');
        empty.textContent = 'This call has no messages.';
        messagesList.append(empty);
      }
      openPanel(messagesPanel);
    };
    const messagesButton = (row) => {
      const count = messageCount(row.input);
      if (!count) return '';
      return { text: count, className: 'count-button', onClick: () => openMessages(row) };
    };
    const addName = (list, seen, name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      list.push(name);
    };
    const callIdOf = (item) => String(item?.id || item?.toolCallId || item?.tool_call_id || item?.call_id || item?.callId || '');
    const resultIdOf = (item) => String(item?.tool_call_id || item?.toolCallId || item?.call_id || item?.callId || item?.id || '');
    const callLists = (row) => {
      const functions = [];
      const server = [];
      const functionCalls = [];
      const serverCalls = [];
      const seenFunctions = new Set();
      const seenServer = new Set();
      const seenCallIds = new Set();
      const seenServerArgs = new Set();
      const serverSpecs = new Map();
      const serverInfo = new Map();
      const functionSpecs = new Map();
      const rememberServerInfo = (item) => {
        const fn = item.function && typeof item.function === 'object' ? item.function : null;
        const name = serverToolName(fn?.name || item.name, item.type || fn?.type);
        if (!name) return;
        if ((fn && fn.arguments != null) || item.arguments != null || callIdOf(item)) return;
        const existing = serverInfo.get(name) || { description: null, schema: null, parameters: null };
        const description = fn?.description ?? item.description;
        if (existing.description == null && typeof description === 'string' && description) existing.description = description;
        if (fn && fn.parameters != null && existing.schema == null) existing.schema = fn.parameters;
        if (!fn && typeof item.type === 'string' && item.type.startsWith('openrouter:') && item.parameters != null && existing.parameters == null) existing.parameters = item.parameters;
        serverInfo.set(name, existing);
      };
      const rememberFunctionSpec = (item) => {
        const fn = item.function && typeof item.function === 'object' ? item.function : null;
        const name = fn?.name || (item.type === 'function' ? item.name : '');
        if (!name || serverToolName(name, item.type || fn?.type)) return;
        if (fn?.arguments != null || item.arguments != null || callIdOf(item)) return;
        const description = fn?.description ?? item.description;
        const schema = fn?.parameters ?? fn?.input_schema ?? fn?.inputSchema ?? item.parameters ?? item.input_schema ?? item.inputSchema;
        if (description == null && schema == null) return;
        const existing = functionSpecs.get(name) || { description: null, schema: null };
        if (existing.description == null && description != null) existing.description = description;
        if (existing.schema == null && schema != null) existing.schema = schema;
        functionSpecs.set(name, existing);
      };
      const resultsById = new Map();
      const resultsByName = [];
      const rememberResult = (item) => {
        const content = item.content ?? item.output ?? item.result;
        if (content == null) return;
        const id = resultIdOf(item);
        if (id) {
          resultsById.set(id, content);
          return;
        }
        const raw = item.name || item.toolName || item.tool_name;
        const name = serverToolName(raw, item.type) || raw;
        if (typeof name === 'string' && name) resultsByName.push({ name, content });
      };
      const pushCall = (list, seenNames, nameList, name, call) => {
        addName(nameList, seenNames, name);
        const id = callIdOf(call);
        if (id && seenCallIds.has(id)) return;
        if (id) seenCallIds.add(id);
        const args = call?.function?.arguments ?? call?.arguments ?? call?.parameters ?? '';
        if (!id && list === serverCalls) {
          const key = name + '\\0' + (typeof args === 'string' ? args : JSON.stringify(args));
          if (seenServerArgs.has(key)) return;
          seenServerArgs.add(key);
        }
        list.push({ name, id, arguments: args, result: null });
      };
      const visit = (item) => {
        const next = parsed(item);
        if (!next || typeof next !== 'object') return;
        if (Array.isArray(next)) {
          next.forEach(visit);
          return;
        }
        rememberFunctionSpec(next);
        rememberServerInfo(next);
        const ownServer = serverToolName(next.name || next.toolName || next.tool_name, next.type);
        const isResult = next.role === 'tool' || next.type === 'function_call_output' || next.type === 'tool_result';
        const isServerSpec = typeof next.type === 'string' && next.type.startsWith('openrouter:') && next.parameters != null && !callIdOf(next) && next.arguments == null && !next.function;
        if (isResult) rememberResult(next);
        else if (isServerSpec) serverSpecs.set(ownServer, next.parameters);
        else if (ownServer && (next.arguments != null || callIdOf(next) || next.type === 'reasoning.server_tool_call')) pushCall(serverCalls, seenServer, server, ownServer, next);
        const calls = next.toolCalls || next.tool_calls;
        if (Array.isArray(calls)) {
          for (const call of calls) {
            const name = call?.function?.name || call?.name || call?.toolName || call?.tool_name;
            const serverName = serverToolName(name, call?.type);
            if (serverName) pushCall(serverCalls, seenServer, server, serverName, call);
            else if (name) pushCall(functionCalls, seenFunctions, functions, name, call);
          }
        }
        for (const [key, child] of Object.entries(next)) {
          if (key === 'toolCalls' || key === 'tool_calls') continue;
          visit(child);
        }
      };
      visit(row.input);
      visit(row.output);
      visit(row.metadata);
      for (const [name, args] of serverSpecs) {
        const matches = serverCalls.filter((call) => call.name === name);
        const info = serverInfo.get(name) || { description: null, schema: null, parameters: null };
        if (info.parameters == null) info.parameters = args;
        serverInfo.set(name, info);
        if (!matches.length) {
          addName(server, seenServer, name);
          serverCalls.push({ name, id: '', arguments: '', result: null });
        }
      }
      const metadata = parsed(row.metadata);
      const generation = metadata?.openrouter_generation || metadata?.openrouterGeneration;
      const usage = generation?.native_server_tool_use || generation?.nativeServerToolUse;
      const searches = Number(usage?.web_search_requests || usage?.webSearchRequests || generation?.num_search_results || generation?.numSearchResults || 0);
      if (searches > 0 && !serverCalls.some((call) => call.name === 'openrouter:web_search')) {
        addName(server, seenServer, 'openrouter:web_search');
        serverCalls.push({ name: 'openrouter:web_search', id: '', arguments: { web_search_requests: searches }, result: null });
      }
      const attach = (call) => {
        if (call.id && resultsById.has(call.id)) call.result = resultsById.get(call.id);
      };
      for (const call of functionCalls) {
        attach(call);
        const spec = functionSpecs.get(call.name);
        if (!spec) continue;
        call.description = spec.description;
        call.schema = spec.schema;
      }
      for (const call of serverCalls) {
        attach(call);
        const spec = serverInfo.get(call.name);
        if (!spec) continue;
        call.description = spec.description;
        call.schema = spec.schema;
        call.parameters = spec.parameters;
      }
      for (const result of resultsByName) {
        const call = [...functionCalls, ...serverCalls].find((item) => item.name === result.name && item.result == null);
        if (call) call.result = result.content;
      }
      const matched = new Set([...functionCalls, ...serverCalls].map((call) => call.id).filter((id) => id && resultsById.has(id)));
      const orphanResults = [...resultsById].filter(([id]) => !matched.has(id));
      return { functions: functions.join(', '), server: server.join(', '), functionCalls, serverCalls, specs: functionSpecs, orphanResults };
    };
    const listedCalls = (rows) => {
      const parsed = rows.map((row) => ({ row, calls: callLists(row) }));
      const byId = new Map();
      const byName = new Map();
      const keep = (name, spec) => {
        if (!name || !spec) return;
        const existing = byName.get(name) || { description: null, schema: null };
        if (existing.description == null && spec.description != null) existing.description = spec.description;
        if (existing.schema == null && spec.schema != null) existing.schema = spec.schema;
        byName.set(name, existing);
      };
      for (const item of parsed) {
        for (const [name, spec] of item.calls.specs) keep(name, spec);
        for (const call of item.calls.functionCalls) {
          keep(call.name, call);
          if (call.id && (call.description != null || call.schema != null)) byId.set(call.id, { description: call.description ?? null, schema: call.schema ?? null, name: call.name, arguments: call.arguments });
        }
      }
      for (const item of parsed) {
        for (const call of item.calls.functionCalls) {
          const spec = (call.id && byId.get(call.id)) || byName.get(call.name);
          if (!spec) continue;
          if (call.description == null && spec.description != null) call.description = spec.description;
          if (call.schema == null && spec.schema != null) call.schema = spec.schema;
        }
        for (const [id, content] of item.calls.orphanResults) {
          if (item.calls.functionCalls.some((call) => call.id === id)) continue;
          const original = [...parsed].flatMap((entry) => entry.calls.functionCalls).find((call) => call.id === id);
          const spec = byId.get(id) || (original && byName.get(original.name));
          if (!original && !spec) continue;
          item.calls.functionCalls.push({
            name: original?.name || spec?.name || '',
            id,
            arguments: original?.arguments ?? spec?.arguments ?? '',
            result: content,
            description: original?.description ?? spec?.description ?? null,
            schema: original?.schema ?? spec?.schema ?? null,
          });
        }
      }
      return new Map(parsed.map((item) => [item.row, item.calls]));
    };
    const callCard = (label, value, empty) => {
      const card = document.createElement('article');
      card.className = 'message';
      const role = document.createElement('div');
      role.className = 'role';
      role.textContent = label;
      const body = document.createElement('pre');
      const text = value == null ? '' : formatted(value);
      body.textContent = text || empty;
      card.append(role, body);
      return card;
    };
    const serverDocUrl = (name) => {
      const slugs = {
        'openrouter:web_search': 'web-search',
        'openrouter:datetime': 'datetime',
        'openrouter:image_generation': 'image-generation',
        'openrouter:web_fetch': 'web-fetch',
        'openrouter:apply_patch': 'apply-patch',
        'openrouter:shell': 'shell',
        'openrouter:bash': 'bash',
        'openrouter:fusion': 'fusion',
        'openrouter:advisor': 'advisor',
        'openrouter:subagent': 'subagent',
        'openrouter:experimental__search_models': 'search-models',
        'openrouter:tool_search': 'tool-search',
        'openrouter:files': 'files',
      };
      const slug = slugs[name] || (typeof name === 'string' && name.startsWith('openrouter:') ? name.slice('openrouter:'.length).replaceAll('_', '-') : '');
      if (!slug || !pageId(slug)) return '';
      return 'https://openrouter.ai/docs/guides/features/server-tools/' + slug;
    };
    const openCall = (name, items) => {
      callTitle.textContent = name;
      callList.replaceChildren();
      const docs = serverDocUrl(name);
      if (docs) {
        const line = document.createElement('p');
        line.className = 'docs';
        const link = document.createElement('a');
        link.href = docs;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Documentation';
        line.append(link);
        callList.append(line);
      }
      const description = items.find((item) => item.description)?.description;
      const parameters = items.find((item) => item.parameters)?.parameters;
      const schema = items.find((item) => item.schema)?.schema;
      if (description) callList.append(callCard('Description', description, ''));
      if (parameters) callList.append(callCard('Parameters', parameters, ''));
      if (schema) callList.append(callCard('Schema', schema, ''));
      items.forEach((item, index) => {
        if (items.length > 1) {
          const heading = document.createElement('h3');
          heading.textContent = 'Call ' + (index + 1);
          callList.append(heading);
        }
        callList.append(callCard('Arguments', item.arguments, 'None'));
        if (item.result != null && item.result !== '') callList.append(callCard('Result', item.result, ''));
      });
      openPanel(callPanel);
    };
    const callButtons = (items) => {
      const grouped = new Map();
      for (const call of items) {
        const list = grouped.get(call.name) || [];
        list.push(call);
        grouped.set(call.name, list);
      }
      if (!grouped.size) return '';
      return {
        buttons: [...grouped].map(([name, group]) => ({
          text: name,
          className: 'count-button',
          onClick: () => openCall(name, group),
        })),
      };
    };
    const functionButtons = (calls) => callButtons(calls.functionCalls);
    const serverButtons = (calls) => callButtons(calls.serverCalls);
    const parsed = (value) => {
      if (typeof value !== 'string') return value;
      const text = value.trim();
      const first = text[0];
      if (first !== '{' && first !== '[') return value;
      try { return JSON.parse(text); } catch { return value; }
    };
    const pretty = (value) => {
      const next = parsed(value);
      if (Array.isArray(next)) return next.map(pretty);
      if (next && typeof next === 'object') {
        return Object.fromEntries(Object.entries(next).map(([key, item]) => [key, pretty(item)]));
      }
      return next;
    };
    const showDetail = (row) => {
      detail.replaceChildren();
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(pretty({ input: row.input, output: row.output, metadata: row.metadata }), null, 2);
      detail.append(pre);
    };

    const fillModels = (models) => {
      const selected = new Set(applyUrlModels ? urlModels : selectedModels());
      applyUrlModels = false;
      fillingModels = true;
      filterModelMenu.replaceChildren();
      for (const model of models || []) {
        const option = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = model;
        input.checked = selected.has(model);
        option.append(input, document.createTextNode(model));
        filterModelMenu.append(option);
      }
      const kept = selectedModels();
      filterModelButton.textContent = modelLabel();
      fillingModels = false;
      return kept.length === selected.size;
    };

    let providersLoaded = false;
    const loadProviders = async () => {
      if (providersLoaded) return;
      try {
        const response = await fetch('/api/providers');
        const payload = await response.json();
        if (!response.ok) return;
        rememberProviders(payload.providers);
        providersLoaded = true;
      } catch { /* The names still show when the provider list is unavailable. */ }
    };

    const loadCatalog = () => fetch('/api/catalog?' + queryString())
      .then((response) => response.json())
      .then(async (catalog) => {
        catalogData = catalog;
        filters.hidden = !catalog.configured;
        columnsButton.hidden = !catalog.configured;
        exportButton.hidden = !catalog.configured;
        if (!catalog.configured) {
          notice.textContent = catalog.message || 'The log file is not open.';
          summary.hidden = true;
          calls.hidden = true;
          hideStats();
          return;
        }
        if (!fillModels(catalog.models)) {
          loadCatalog();
          return;
        }
        await loadProviders();
        suppressHistory = true;
        current();
        suppressHistory = false;
      })
      .catch((error) => {
        notice.textContent = error.message;
      });

    navPipelines.addEventListener('click', showPipelines);
    navAgents.addEventListener('click', showAgents);
    navSettings.addEventListener('click', showSettings);
    settingsPassword.addEventListener('submit', async (event) => {
      event.preventDefault();
      settingsPasswordMessage.textContent = '';
      const data = new FormData(settingsPassword);
      const response = await fetch('/api/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current: data.get('current'), password: data.get('password') }),
      });
      const payload = await response.json().catch(() => ({}));
      settingsPasswordMessage.textContent = response.ok ? 'Password changed' : (payload.error || 'Could not change the password');
      if (response.ok) settingsPassword.reset();
    });
    filterWindow.addEventListener('change', () => { replaceFilters(); loadCatalog(); });
    filterModelButton.addEventListener('click', () => {
      filterModelMenu.hidden = !filterModelMenu.hidden;
      if (!filterModelMenu.hidden) columnsMenu.hidden = true;
    });
    columnsButton.addEventListener('click', () => {
      columnsMenu.hidden = !columnsMenu.hidden;
      columnsButton.setAttribute('aria-expanded', columnsMenu.hidden ? 'false' : 'true');
      if (!columnsMenu.hidden) filterModelMenu.hidden = true;
    });
    filterModelMenu.addEventListener('change', () => {
      filterModelButton.textContent = modelLabel();
      if (!fillingModels) { replaceFilters(); loadCatalog(); }
    });
    document.addEventListener('click', (event) => {
      if (!filterModel.contains(event.target)) filterModelMenu.hidden = true;
      if (!columnsPicker.contains(event.target)) {
        columnsMenu.hidden = true;
        columnsButton.setAttribute('aria-expanded', 'false');
      }
      if (sidePanels.some((panel) => !panel.hidden && !panel.contains(event.target))) closePanels();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidePanels.some((panel) => !panel.hidden)) closePanels();
    });
    agentsClose.addEventListener('click', closePanels);
    exportButton.addEventListener('click', exportTable);
    messagesClose.addEventListener('click', closePanels);
    callClose.addEventListener('click', closePanels);
    filterName.addEventListener('input', () => { replaceFilters(); current(); });
    filterFailures.addEventListener('change', () => { replaceFilters(); current(); });
    const openRoute = () => {
      const route = routeFromLocation();
      if (!route) {
        history.replaceState(null, '', addressFor({ page: 'pipelines' }));
        showPipelines();
        return;
      }
      if (route.page === 'pipeline') showExecutions({ name: route.name });
      else if (route.page === 'session') showExecution({ name: route.name, traceId: route.traceId });
      else if (route.page === 'agents') showAgents();
      else if (route.page === 'settings') showSettings();
      else if (route.page === 'agent') showAgent({ name: route.name, pipelineName: route.pipelineName });
      else if (route.page === 'agent-execution') showAgentExecution({ name: route.name, pipelineName: route.pipelineName }, { traceId: route.traceId });
      else showPipelines();
    };
    window.addEventListener('popstate', () => {
      const previous = queryString();
      readFilters();
      suppressHistory = true;
      if (queryString() !== previous) {
        current = openRoute;
        loadCatalog();
      } else {
        openRoute();
      }
      suppressHistory = false;
    });
    readFilters();
    const opening = routeFromLocation();
    const canonical = addressFor(opening || { page: 'pipelines' });
    if (location.pathname + location.search !== canonical) history.replaceState(null, '', canonical);
    nameKind = filterKind(opening ? opening.page : 'pipelines');
    current = openRoute;
    loadCatalog();
  </script>
</body>
</html>
`;
