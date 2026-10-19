# AurorApp 🌈

**L'estate della tua bimba, un giorno alla volta.** PWA offline che genera il piano
giornaliero di attività di una bambina di tre anni per tutti e tre i mesi delle vacanze,
più un timer dei pasti a arcobaleno pensato per essere letto dagli occhi di una bimba.

![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![PWA](https://img.shields.io/badge/PWA-offline-5a0fc8)
![Test](https://img.shields.io/badge/test-93%20file-2a6e4e)
![Stato](https://img.shields.io/badge/stato-online-2a6e4e)

🌐 **Sito:** <https://ialias.github.io/AurorApp/>

## Cosa fa

- **Un piano al giorno per tutta l'estate**, mai la stessa attività entro 14 giorni.
- **150 attività in 10 categorie**, con la struttura pedagogica di una maestra d'asilo:
  istruzioni, materiali, obiettivo di sviluppo e note di sicurezza per ognuna.
- **Timer dei pasti a arcobaleno**, leggibile da una bambina che non sa ancora leggere.
- **Cento per cento locale**: nessun account, nessuna chiamata di rete, nessun dato che
  esce dal dispositivo. Funziona in aereo e in spiaggia senza campo.

## Stack

React + TypeScript + Vite, React Router, Framer Motion, date-fns. PWA con service worker
per l'uso offline.

## Avvio in locale

```bash
npm install
npm run dev          # sviluppo
npm run build        # build di produzione (dist/)
npm run preview      # anteprima della build
```

Qualità:

```bash
npm run test         # Vitest (93 file di test)
npm run e2e          # Playwright
npm run typecheck
npm run lint
```

## Struttura

| Percorso | Cosa contiene |
|---|---|
| `src/app/` | shell dell'app e routing |
| `src/features/` | le funzionalità: piano, timer, catalogo |
| `src/core/` | logica pura: generatore del piano, regole, date |
| `src/ui/`, `src/styles/` | componenti e design system |
| `docs/superpowers/specs/` | specifiche complete e **catalogo normativo delle 150 attività** |
| `e2e/` | test end-to-end Playwright |

## Stato

**Finita e non pubblicata.** 63 commit, 93 file di test, nessuna dipendenza da servizi
esterni. Ha una finestra d'uso stagionale: riapre a giugno.

Pubblicarla costa mezz'ora di GitHub Pages. Finché non è online, nessuno può usarla.

## Licenza

Codice pubblico su GitHub, **nessuna licenza d'uso concessa**: tutti i diritti riservati.
Puoi leggere e imparare, non usare o ridistribuire senza permesso.
