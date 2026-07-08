/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Task 20 (FR-8, sezione Info): versione app iniettata a build-time da
// `vite.config.ts` (`define`) a partire da `package.json`, cosi' la UI la
// legge da `import.meta.env` come richiesto dal brief invece di importare
// direttamente il JSON del pacchetto.
interface ImportMetaEnv {
  readonly APP_VERSION: string;
}
