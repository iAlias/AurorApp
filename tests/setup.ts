import '@testing-library/jest-dom/vitest';

// jsdom non ha service worker: il modulo virtuale del plugin PWA diventa un
// registratore che non trova mai aggiornamenti (UpdatePrompt resta nascosto).
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));
