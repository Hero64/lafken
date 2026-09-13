import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightThemeRapide from 'starlight-theme-rapide';

export default defineConfig({
  site: 'https://hero64.github.io',
  base: '/lafken',
  integrations: [
    starlight({
      title: 'Lafken',
      logo: {
        light: './src/assets/logo-light.png',
        dark: './src/assets/logo-dark.png',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Hero64/lafken' },
      ],
      editLink: {
        baseUrl: 'https://github.com/Hero64/lafken/edit/main/apps/docs/',
      },
      plugins: [starlightThemeRapide()],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Getting Started', slug: 'guides/getting-started' },
            { label: 'Core Concepts', slug: 'guides/core-concepts' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Testing', slug: 'guides/testing' },
            { label: 'Adding a Resource Type', slug: 'guides/adding-a-resource-type' },
            { label: 'Releasing', slug: 'guides/releasing' },
          ],
        },
        {
          label: 'Packages',
          items: [
            { label: 'Main', slug: 'packages/main' },
            { label: 'Common', slug: 'packages/common' },
            { label: 'Resolver', slug: 'packages/resolver' },
            { label: 'Api', slug: 'packages/api' },
            { label: 'Auth', slug: 'packages/auth' },
            { label: 'Bucket', slug: 'packages/bucket' },
            { label: 'Dynamo', slug: 'packages/dynamo' },
            { label: 'Event', slug: 'packages/event' },
            { label: 'Queue', slug: 'packages/queue' },
            { label: 'Schedule', slug: 'packages/schedule' },
            { label: 'Standalone', slug: 'packages/standalone' },
            { label: 'State Machine', slug: 'packages/state-machine' },
          ],
        },
      ],
    }),
  ],
});
