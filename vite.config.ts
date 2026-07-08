/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version as appVersion } from './package.json';

export default defineConfig({
  plugins: [react()],
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
