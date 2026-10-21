/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version as appVersion } from './package.json';

export default defineConfig(({ command, mode }) => ({
  // Solo la build di produzione va servita da una sottocartella dell'hosting
  // statico (tuosito.it/arcobimbi/): asset/manifest/service worker devono
  // referenziare quel prefisso. `npm run dev` (e quindi anche gli e2e
  // Playwright, che puntano a localhost:5173/) restano sulla radice. Chi
  // pubblica altrove lo sovrascrive da riga di comando con `--base` (GitHub
  // Pages: nome del repo). L'app Android (`--mode android`, servita da
  // Capacitor su https://localhost/) sta alla radice. React Router legge lo
  // stesso valore da `import.meta.env.BASE_URL` (vedi `src/app/router.tsx`).
  base: command === 'build' && mode !== 'android' ? '/arcobimbi/' : '/',
  plugins: [
    react(),
    // Task 21 (FR-10): app installabile e utilizzabile offline. `registerType:
    // 'prompt'` evita l'aggiornamento silenzioso: l'utente vede il toast
    // `UpdatePrompt` e decide quando ricaricare. Icone generate a
    // `scripts/gen-icons.mjs` (build-time, non committate come sorgente).
    VitePWA({
      // Nell'app Android i file sono già nel pacchetto e gli aggiornamenti
      // arrivano dallo store: niente service worker né avviso di aggiornamento
      // (con `disable` il modulo `virtual:pwa-register` resta, ma non fa nulla).
      disable: mode === 'android',
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Arcobimbi',
        short_name: 'Arcobimbi',
        description: 'Giornate piene di gioco per bambini dai 2 ai 5 anni: attività, timer arcobaleno e minigiochi. Tutto offline.',
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
}));
