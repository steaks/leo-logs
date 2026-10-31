import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Leo Logs',
  description: 'OpenRouter logs for pipelines and agents.',
  themeConfig: {
    nav: [
      { text: 'Overview', link: '/' },
      { text: 'Quick Start', link: '/quick-start/web-app/deploy' },
    ],
    sidebar: [
      { text: 'Overview', link: '/' },
      {
        text: 'Quick Start',
        collapsed: false,
        items: [
          {
            text: 'Web App',
            collapsed: false,
            items: [
              { text: 'Deploy the Leo Logs website', link: '/quick-start/web-app/deploy' },
              { text: 'Connect to OpenRouter', link: '/quick-start/web-app/connect' },
            ],
          },
          { text: 'Code Integration', link: '/quick-start/code' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
  },
});
