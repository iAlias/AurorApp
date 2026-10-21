# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcobimbi (formerly "AurorApp"; renamed 2026-10-21 — the spec docs and the GitHub repo still use the old
name): an offline-first PWA (React + TypeScript + Vite), also packaged as an Android app with Capacitor,
that proposes a daily activity plan for a 2–5-year-old, year-round, plus a "rainbow" timer (meals and
other routines) and 16 mini-games. It started as a summer-vacation app: on 2026-10-21 the vacation period
(start/end dates, end-of-summer recap) and the Calendar screen were removed on purpose — don't
reintroduce them. It is meant for any child, so every child-facing text is
gender-aware (see "Personalized text" below). 100% local data (localStorage), zero backend, zero accounts,
zero runtime network calls. it-IT only: UI copy, code comments and commit messages are all in Italian
(conventional-commit prefixes, e.g. `feat(giochi): ...`, `fix(ux): ...`).

Full requirements/design/catalog live in `docs/superpowers/specs/2026-07-04-aurorapp-design.md` and
`docs/superpowers/specs/2026-07-04-aurorapp-catalogo-attivita.md`; the milestone-by-milestone build plan is
in `docs/superpowers/plans/2026-07-04-aurorapp.md`. Treat these as the original design intent, not always
the current state of the code — the app has evolved well past the original M0–M7 plan (no vacation
period or calendar anymore, nav items "Catalogo"/"Giochi", timer presets and speed-up, gender-aware texts,
voice prompts, nursery option, cold weather, Android). When spec and
code disagree, the code is ground truth; update the spec docs only if asked.

## Commands

```
npm run dev              # Vite dev server, http://localhost:5173 (base path is "/" in dev)
npm run check            # typecheck && lint && test && build — the gate for any change
npm run typecheck        # tsc --noEmit
npm run lint             # eslint src tests e2e --max-warnings 0
npm run test             # vitest run (all unit tests)
npm run test:watch       # vitest watch mode
npm run e2e              # playwright test (auto-starts the dev server if not already running)
npm run format           # prettier --write
npm run android:sync     # vite build --mode android && cap sync android
node scripts/gen-icons.mjs  # regenerates every icon/splash (web, android/, store/) from one SVG
```

Single test file: `npx vitest run tests/path/to/file.test.tsx`
Single e2e spec: `npx playwright test e2e/timer.spec.ts`

Android build (JDK 21 + Android SDK; on this machine `JAVA_HOME` isn't set globally, the JDK is in
`~/.jdks/temurin-21`, the SDK path is in the git-ignored `android/local.properties`):
`cd android && ./gradlew assembleDebug` (APK in `app/build/outputs/apk/debug/`) or `./gradlew bundleRelease`
(AAB, signed with the git-ignored `android/keystore.properties` + `.jks`). Always `npm run android:sync`
first: the Android project serves a copy of `dist/`, not the sources.

`npm install` of vitest 4 hits an npm 10 arborist bug ("Cannot read properties of null (reading
'edgesOut')"); `npx npm@11 install ...` works, and the resulting lockfile installs fine with `npm ci` on npm 10.

## Architecture

### `core/` is pure logic — the most important rule in this codebase

`src/core/**` never imports from `src/features/**` or `src/ui/**`, has zero React/DOM dependencies, and is
100% unit tested. Every function that depends on time or randomness receives it as an explicit parameter
(`now: number`, `rng: () => number`) rather than reading `Date.now()`/`Math.random()` internally — this is
what makes the planner and timer deterministic and testable. Screens in `features/` call the planner/timer
only through the Zustand store (`src/app/store.ts`), never directly.

```
src/core/
  catalog/    activities.ts (150 fixed activities, IDs 'MOT-01'…'CAL-15'), categories.ts, types.ts (all shared
              types), personalize.ts ({f|m} variants + {nome})
  planner/    generator.ts (day-plan generation), rng.ts (mulberry32/hashSeed), history.ts, slots.ts
  timer/      timerMachine.ts (pure state machine), progress.ts (elapsed/progress math)
  progress/   streak.ts, badges.ts
  storage/    envelope.ts, persist.ts, exportImport.ts (zod-validated)
  games/      one round generator per game (makeColorRound(rng), …), shuffle.ts — rng always a parameter
src/features/ # one folder per screen: wizard/, today/, mealTimer/, catalog/, games/, settings/, dev/
src/ui/       # design system: Button, Card, Chip, Modal, Sheet, TimeField, Rainbow (SVG), PageFlip3D,
              # audio.ts (WebAudio-synthesized sounds — no mp3 assets), speech.ts (text-to-speech),
              # confetti.ts, motion.ts (reduced-motion hook)
src/app/      # store.ts (Zustand), router.tsx, Layout.tsx (nav chrome), useToday.ts, usePersonalize.ts
```

No path aliases are configured — all imports are relative.

### Personalized text (child's name and gender)

The profile has `gender: 'f' | 'm'` (chosen in the wizard; zod defaults missing values to `'f'` because
every pre-existing profile was a girl's). Child-facing strings are written with variants
`{femminile|maschile}` (e.g. `comanda {lei|lui}`, `Bravissim{a|o}`) and the `{nome}` placeholder, resolved by
`personalize()` in `core/catalog/personalize.ts`. Screens never read `ACTIVITIES` for display: they use
`useCatalog()` (same ids/order, texts resolved) and `usePersonalize()` for other strings (badges, timer
celebrations, GameShell) — both in `src/app/usePersonalize.ts`. The planner/store keep using the raw
catalog. `tests/core/catalog/personalize.test.ts` fails if a variant is malformed or if the masculine
rendering still contains feminine references to the child; when editing catalog text, write new
references to the child with variants (the Lei of courtesy, "ecco a lei", stays as is).

### Determinism contract for the day-plan generator

A day's seed is `hashSeed(\`${profile.createdAt}|${date}|${plan.regenNonce}|${weather}\`)` fed into
`mulberry32`. Same inputs ⇒ bit-identical plan, forever. Changing weather only changes the seed (and thus
only regenerates slots that are actually incompatible with it) — completed slots are never silently
overwritten by a reseed. `materializeRange(from, to)` (store: `ensurePlans`) generates missing days in
chronological order, each seeing the previous ones (history-dependent rules: no repeat within 14 days,
etc.). The Today page only ever asks for today and tomorrow: days the app wasn't opened stay without a
plan (no backfill), so the stored plans don't grow with idle time and unseen days don't "consume"
activities. A new day starts with `seasonalWeather(date)` (November–March `'freddo'`, else `'sole'`).

### Day structure

`deriveSlots` (`core/planner/slots.ts`): weekdays M1, M2, P1, P2, SERA; weekends (`familyDay`) M1, P1;
weekdays with `routine.school` (child at nursery/kindergarten in the morning) P1, P2, SERA only — the
Today timeline then shows a single "Al nido / all'asilo" block instead of the morning/lunch/nap anchors.
Weather rules live in `weatherOk` (`pioggia` no outdoor, `caldo` no outdoor in M2/P2, `freddo` no outdoor
water play). When a routine change removes a slot that was already `done`, `buildDay` keeps that slot in
the plan (it still counts for progress) even though the timeline no longer shows it.

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
`persist.ts`), and every store action writes the full envelope back to `localStorage['arcobimbi.state.v1']`
write-through (immediately, not debounced) on completion. When adding a new store action that mutates
persisted state, make sure it actually commits the envelope — a previous bug (`updateSettings`) mutated
in-memory state without writing through, so settings changes were lost on reload. `loadEnvelope` falls back
to the pre-rename key `aurorapp.state.v1` when the new one is missing (the first save migrates it); `resetAll`
deletes the old key too. Schema additions to the profile must be optional/defaulted in zod so older saves
and backups keep loading.

### Timer presets

`features/mealTimer/` despite its name hosts the generic timer. The five presets (pranzo, cena, vestirsi,
riordino, libero — the last labelled "Altro") are keyed by `TimerKind` (`core/catalog/types.ts`) and all
their copy/default durations live in one map, `TIMER_KINDS` in `features/mealTimer/timerKinds.ts`; a new
preset means extending `TimerKind` + that map, nothing else. Pranzo/cena take their duration from
`settings.meals` rather than `defaultMinutes`.

### Games (`/giochi`)

`features/games/registry.ts` (`GAMES`) is the single source for both the grid order in `GamesPage` and
the `/giochi/:gameId` route slug. Every game renders inside `GameShell` (header, progress stars, final
"Bravissima/o!" screen with confetti/sound once); `totalRounds: 0` means free play (e.g. Disegna col dito,
Suona l'arcobaleno) and the shell itself suppresses the final screen in that case. GameShell's `prompt` is
read aloud (`ui/speech.ts`) at every new round and by its 🔊 button, because the target users can't read
— every game should pass one. "Tap the right one" games share their round cycle via
`useChoiceRounds` (`features/games/useChoiceRounds.ts`); the older games still inline the same pattern.
Round logic lives in `core/games/` as pure functions taking `rng`; the components pass `Math.random` at the
call site — that's the only place real randomness enters. Games only read from the store
(`settings.meals.soundsOn`, the child's name/gender), never write to it.

### Audio and voice

`ui/audio.ts` synthesizes every sound with WebAudio; the browser only allows it after a user gesture, so
`Layout` unlocks it on every `pointerdown` and applies the settings volume — new sounds just call
`audioManager.play/tone` and respect `soundsOn`. `ui/speech.ts` wraps `@capacitor-community/text-to-speech`
(web: `speechSynthesis`; Android: the system TTS engine) and must never throw: no voice available ⇒ silence.

### Timer child-lock pattern

Every control on the running-timer screen that a 3-year-old could trigger by tapping the screen (pause,
exit, "finished early", speed change) uses the same long-press gate: `useLongPress` (`src/ui/useLongPress.ts`,
~3000ms hold, cancels if the pointer moves), never a plain `onClick`. This is a deliberate safety property,
not a styling choice — when adding a new destructive/state-changing control to that screen, reuse this
pattern rather than a tap handler.

### Routing / deploy / Android

`vite.config.ts`'s `base` is `'/'` for `vite dev` and for `vite build --mode android`, `'/arcobimbi/'` for
other builds; callers override it with `vite build --base=...`. `src/app/router.tsx` mirrors it via
`basename: import.meta.env.BASE_URL` on `createBrowserRouter` only (tests use `createMemoryRouter` with
absolute paths, unaffected). React Router is v7: navigations run in a transition, so a lazily-loaded route
keeps the previous page on screen until its chunk arrives (e2e tests must wait for the new page, not just
click). `/dev/ui` (design-system showcase) is only registered when `import.meta.env.DEV`.

Deploy targets:
- **GitHub Pages**: `.github/workflows/pages.yml` runs on every push to `master` — pushing to master
  deploys. It builds with `--base=/<repo name>/` (so renaming the repo needs no change) and copies
  `dist/index.html` to `dist/404.html` as the SPA fallback, since Pages has no rewrite rules.
- **Generic static hosting in `/arcobimbi/`** (the default `base`): `public/.htaccess` holds the matching
  SPA-fallback rewrite; change both together.
- **Android** (Capacitor 8, `capacitor.config.json`, app id `it.digitstudio.arcobimbi`): `--mode android`
  disables the PWA plugin (no service worker/update prompt — updates come from the store) and serves from
  `https://localhost/`. The Android back button is handled in `src/main.tsx` (history back, minimize at the
  root). `versionName`/`versionCode` are derived from `package.json` `version` in `android/app/build.gradle`.
  The privacy policy is `public/privacy.html`, linked from Settings.

PWA (`vite-plugin-pwa`, `registerType: 'prompt'`): new versions are not applied silently —
`src/app/UpdatePrompt.tsx` asks the user to reload.

### Layout constraints

`index.html` uses `viewport-fit=cover` and the Android app is edge-to-edge: anything fixed to the bottom of
the screen (tab bar, toasts, sheets, wizard footer) adds `env(safe-area-inset-bottom)` to its padding/offset,
and `body` pads the top/sides. The bottom tab bar holds 5 items: labels must stay short enough for a 360px
screen.

Any new animation must use only `transform`/`opacity` and must degrade to a static/fade state when
`useReducedMotionPref()` (`src/ui/motion.ts`) is on — this hook is checked throughout the codebase; a
missed check here is a recurring category of review finding. Touch targets for the child are ≥64px.

## Testing conventions

- `core/*` modules get plain Vitest unit tests with no DOM.
- `features/*` components are tested with Vitest + Testing Library; look at existing sibling tests in
  `tests/features/<feature>/` for the store-mocking/setup pattern before writing new ones. Game tests mock
  `ui/confetti` and `ui/speech`, and count buttons with `optionButtons()` (excludes GameShell's 🔊).
- `tests/setup.ts` mocks `virtual:pwa-register/react` (jsdom has no service worker).
- e2e specs (`e2e/*.spec.ts`) use Playwright at a 390×844 mobile viewport by default (`playwright.config.ts`).
- When testing time-dependent logic (planner, timer) pass explicit timestamps/seeds, and pin the date
  (`vi.setSystemTime`) in component tests that render "today" — otherwise they depend on the real date.
