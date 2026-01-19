// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['neals-mac-studio']
    }
  },

  adapter: node({
    mode: 'standalone'
  }),

  server: {
    port: 4321,
    host: true
  }
});