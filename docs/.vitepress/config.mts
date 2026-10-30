import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Leo Logs',
  description: 'OpenRouter logs for pipelines and agents. leologs.dev',
  themeConfig: {
    nav: [
      { text: 'Pipelines', link: '/pipelines' },
      { text: 'Agents', link: '/agents' },
      { text: 'Run', link: '/run' },
    ],
    sidebar: [
      {
        text: 'Logs',
        items: [
          { text: 'Pipelines', link: '/pipelines' },
          { text: 'Agents', link: '/agents' },
          { text: 'Run', link: '/run' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
  },
});
