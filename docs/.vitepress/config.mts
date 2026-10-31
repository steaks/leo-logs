import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Leo Logs',
  description: 'OpenRouter logs for pipelines and agents.',
  themeConfig: {
    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Pipelines', link: '/pipelines' },
      { text: 'Agents', link: '/agents' },
    ],
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Integrate', link: '/integrate' },
          { text: '@leo-logs/trace', link: '/trace' },
        ],
      },
      {
        text: 'Logs',
        items: [
          { text: 'Pipelines', link: '/pipelines' },
          { text: 'Agents', link: '/agents' },
          { text: 'The log page', link: '/log-page' },
        ],
      },
      {
        text: 'Run',
        items: [
          { text: 'Run', link: '/run' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
  },
});
