/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version as appVersion } from './package.json';

export default defineConfig({
  plugins: [
    react(),
    // Task 21 (FR-10): app installabile e utilizzabile offline. `registerType:
    // 'prompt'` evita l'aggiornamento silenzioso: l'utente vede il toast
    // `UpdatePrompt` e decide quando ricaricare. Icone generate a
    // `scripts/gen-icons.mjs` (build-time, non committate come sorgente).
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AurorApp',
        short_name: 'AurorApp',
        lang: 'it',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#FFF8E7',
        background_color: '#FFF8E7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  // Task 20 (FR-8, Info): espone la versione da `package.json` su
  // `import.meta.env.APP_VERSION` (tipizzata in `src/vite-env.d.ts`), così la
  // UI non deve importare il JSON del pacchetto direttamente.
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
