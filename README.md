# AurorApp 🌈

**L'estate della tua bimba, un giorno alla volta.**

Web app (PWA offline, mobile-first) che genera un piano giornaliero di attività per una bimba di 3 anni durante i 3 mesi di vacanze estive — mai la stessa attività entro 14 giorni, con la struttura pedagogica di una maestra d'asilo — più un **timer pasti a arcobaleno** pensato per essere letto dagli occhi di una bimba.

## Documenti di progetto

| Documento | Contenuto |
|---|---|
| [`docs/superpowers/specs/2026-07-04-aurorapp-design.md`](docs/superpowers/specs/2026-07-04-aurorapp-design.md) | **Specifiche complete**: requisiti, architettura, modello dati, algoritmo del generatore, timer, design system, wireframe, edge case, testing, milestone M0–M7 |
| [`docs/superpowers/specs/2026-07-04-aurorapp-catalogo-attivita.md`](docs/superpowers/specs/2026-07-04-aurorapp-catalogo-attivita.md) | **Catalogo normativo delle 150 attività** (10 categorie × 15), con istruzioni, materiali, obiettivi di sviluppo e note di sicurezza |

## Stack (deciso in fase di design)

React 18 + TypeScript strict + Vite · Tailwind CSS · Framer Motion · Zustand · zod · PWA (`vite-plugin-pwa`) · dati 100% locali (localStorage), zero backend, zero account.

## Come sviluppare

Una milestone alla volta (M0 → M7), ognuna in una sessione con Claude Code. Prompt suggerito:

> Leggi `docs/superpowers/specs/2026-07-04-aurorapp-design.md` e il catalogo attività collegato, poi implementa la **milestone M0** rispettando i criteri di accettazione del §13. Esegui `npm run check` prima di dichiarare finito.

Chiudi una milestone solo con `npm run check` verde e criteri di accettazione soddisfatti.
