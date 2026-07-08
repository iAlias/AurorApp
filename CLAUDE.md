# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AurorApp: an offline-first PWA (React + TypeScript + Vite) that generates a daily activity plan for a
3-year-old across a summer vacation period, plus a "rainbow" meal timer. 100% local data (localStorage),
zero backend, zero accounts, zero runtime network calls. it-IT only.

Full requirements/design/catalog live in `docs/superpowers/specs/2026-07-04-aurorapp-design.md` and
`docs/superpowers/specs/2026-07-04-aurorapp-catalogo-attivita.md`; the milestone-by-milestone build plan is
in `docs/superpowers/plans/2026-07-04-aurorapp.md`. Treat these as the original design intent, not always
the current state of the code — the app has evolved past the original M0–M7 plan (e.g. a 5th nav item
"Catalogo" and several timer features were added afterward). When spec and code disagree, the code is
ground truth; update the spec docs only if asked.

## Commands

```
npm run dev              # Vite dev server, http://localhost:5173 (base path is "/" in dev, not "/aurorapp/")
npm run check             # typecheck && lint && test && build — the gate for any change
npm run typecheck         # tsc --noEmit
npm run lint              # eslint src tests e2e --max-warnings 0
npm run test              # vitest run (all unit tests)
npm run test:watch        # vitest watch mode
npm run e2e               # playwright test (auto-starts the dev server if not already running)
npm run format            # prettier --write
```

Single test file: `npx vitest run tests/path/to/file.test.tsx`
Single e2e spec: `npx playwright test e2e/timer.spec.ts`

There is no separate build step needed before `npm run dev`/`test`; only `check`/`e2e` exercise the
production build (Vite `base` differs by command — see Deployment below).

## Architecture

### `core/` is pure logic — the most important rule in this codebase

`src/core/**` never imports from `src/features/**` or `src/ui/**`, has zero React/DOM dependencies, and is
100% unit tested. Every function that depends on time or randomness receives it as an explicit parameter
(`now: number`, `rng: () => number`) rather than reading `Date.now()`/`Math.random()` internally — this is
what makes the planner and timer deterministic and testable. Screens in `features/` call these pure
functions only through the Zustand store (`src/app/store.ts`), never directly.

```
src/core/
  catalog/    activities.ts (150 fixed activities, IDs 'MOT-01'…'CAL-15'), categories.ts, types.ts (all shared types)
  planner/    generator.ts (day-plan generation), rng.ts (mulberry32/hashSeed), history.ts, slots.ts
  timer/      timerMachine.ts (pure state machine), progress.ts (elapsed/progress math)
  progress/   streak.ts, badges.ts
  storage/    envelope.ts, persist.ts, exportImport.ts (zod-validated)
src/features/ # one folder per screen: wizard/, today/, mealTimer/, calendar/, catalog/, settings/, dev/
src/ui/       # design system: Button, Card, Chip, Modal, Sheet, TimeField, Rainbow (SVG), PageFlip3D,
              # audio.ts (WebAudio-synthesized sounds — no mp3 assets), confetti.ts, motion.ts (reduced-motion hook)
src/app/      # store.ts (Zustand), router.tsx, Layout.tsx (nav chrome), useToday.ts
```

No path aliases are configured — all imports are relative.

### Determinism contract for the day-plan generator

A day's seed is `hashSeed(\`${profile.createdAt}|${date}|${plan.regenNonce}|${weather}\`)` fed into
`mulberry32`. Same inputs ⇒ bit-identical plan, forever. Changing weather only changes the seed (and thus
only regenerates slots that are actually incompatible with it) — completed slots are never silently
overwritten by a reseed. `getOrCreatePlan` always materializes missing days in chronological order from the
last materialized day up to the requested date, never a single day in isolation, so history-dependent rules
(no repeat within 14 days, etc.) never depend on navigation order.

### Timer: absolute-timestamp-only, never a separate counter

`src/core/timer/timerMachine.ts` is a pure reducer (`next(session, event, now) => session`). `TimerSession`
stores only `startedAt`/`pausedAt`/`pausedTotalMs`/`durationMs` — every consumer (`useTimerLoop`,
`progress.ts`) recomputes `elapsed`/`progress` from `Date.now()` against those fields on every frame. This
is a deliberate, repeatedly-enforced invariant: **never introduce a second incremental clock/counter**
running in parallel, since two divergent clocks is exactly the kind of bug that causes drift after
backgrounding/pause/resume. When a feature needs to change the effective elapsed time (e.g. the timer's
2x/4x/8x speed-up control), do it by shifting `startedAt` via a new pure event, not by adding a counter.

### State/persistence

`src/app/store.ts` is a plain Zustand `create()` store — not the `persist` middleware. Persistence is
hand-rolled: state is read into a `StorageEnvelope` at startup via zod validation (`core/storage/envelope.ts`,
`persist.ts`), and every store action writes the full envelope back to `localStorage['aurorapp.state.v1']`
write-through (immediately, not debounced) on completion. When adding a new store action that mutates
persisted state, make sure it actually commits the envelope — a previous bug (`updateSettings`) mutated
in-memory state without writing through, so settings changes were lost on reload.

### Timer child-lock pattern

Every control on the running-timer screen that a 3-year-old could trigger by tapping the screen (pause,
exit, "finished early", speed change) uses the same long-press gate: `useLongPress` (`src/ui/useLongPress.ts`,
~3000ms hold, cancels if the pointer moves), never a plain `onClick`. This is a deliberate safety property,
not a styling choice — when adding a new destructive/state-changing control to that screen, reuse this
pattern rather than a tap handler.

### Routing / deploy

`vite.config.ts`'s `base` is command-aware: `'/aurorapp/'` for `vite build`, `'/'` for `vite dev` — this
matters because the production build is meant to be deployed in a subfolder of static hosting
(`tuosito.it/aurorapp/`), but the dev server and Playwright e2e assume root path. `src/app/router.tsx`
mirrors this via `basename: import.meta.env.BASE_URL` on `createBrowserRouter` only (tests use
`createMemoryRouter` with absolute paths, unaffected). `public/.htaccess` has the matching SPA-fallback
rewrite rule. If you change the deploy subfolder, update all three together.

### Animation constraint

Any new animation must use only `transform`/`opacity` and must degrade to a static/fade state when
`useReducedMotionPref()` (`src/ui/motion.ts`) is on — this hook is checked throughout the codebase; a
missed check here is a recurring category of review finding.

## Testing conventions

- `core/*` modules get plain Vitest unit tests with no DOM.
- `features/*` components are tested with Vitest + Testing Library; look at existing sibling tests in
  `tests/features/<feature>/` for the store-mocking/setup pattern before writing new ones.
- e2e specs (`e2e/*.spec.ts`) use Playwright at a 390×844 mobile viewport by default (`playwright.config.ts`).
- When testing time-dependent logic (planner, timer), pass explicit timestamps/seeds rather than relying on
  real time — this mirrors the "no internal clock reads" rule in `core/`.
