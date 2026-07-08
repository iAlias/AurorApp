# Timer Preset + Sezione Giochi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Il timer arcobaleno diventa riusabile per momenti diversi dal pasto — Vestirsi, Riordino giochi e Campo libero — e (B) nasce una nuova sezione "Giochi" nel menu con 10 mini-giochi educativi locali per una bimba di 3 anni.

**Architecture:** (A) si estende l'unione `TimerSession['meal']` (il nome del campo resta `meal` per retrocompatibilità dell'envelope persistito) con tre nuovi valori; la logica pura (`timerMachine`, `progress`) è già agnostica e non cambia; cambiano schema zod, conteggio `mealTimersCompleted` (solo pasti veri), copy di TimerStart/TimerRun/Celebration. (B) segue la separazione consolidata: generatori di round puri e testati in `src/core/games/` (rng sempre parametro), UI in `src/features/games/` con una pagina-griglia, un guscio condiviso `GameShell` (round, stelle, schermata finale) e un file per gioco; route lazy `/giochi/:gameId?` e sesta voce in `NAV_ITEMS`.

**Tech Stack:** React 18 + TypeScript strict + Vite + Tailwind + Framer Motion + Zustand + zod; suoni WebAudio esistenti (`src/ui/audio.ts`), coriandoli esistenti (`src/ui/confetti.ts`). Nessun asset esterno, nessuna chiamata di rete.

## Global Constraints

- `src/core/**` non importa MAI da `src/features/**` o `src/ui/**`, zero React/DOM; ogni funzione che dipende da caso/tempo riceve `rng: () => number` / `now: number` come parametro.
- Timer: MAI un secondo orologio/contatore incrementale — solo timestamp assoluti in `TimerSession`.
- Il campo `TimerSession.meal` NON si rinomina (retrocompatibilità di `localStorage['aurorapp.state.v1']`): si allarga solo l'unione. Un envelope salvato con `meal: 'pranzo'` deve restare valido.
- `progress.mealTimersCompleted` si incrementa SOLO per kind `pranzo`/`cena` (il badge `buona-forchetta` riguarda i pasti).
- Ogni animazione usa solo `transform`/`opacity` e degrada con `useReducedMotionPref()` (`src/ui/motion.ts`).
- Suoni sempre condizionati a `settings.meals.soundsOn` e riprodotti via `audioManager` (`src/ui/audio.ts`, nomi: `'pop' | 'arc' | 'almost' | 'party' | 'done-day' | 'badge' | 'tick'`) — niente nuovi file audio.
- Tutte le stringhe UI in italiano (it-IT). Femminile per la bimba ("Bravissima").
- Target touch per la bimba ≥ 64px; feedback d'errore SEMPRE gentile (wiggle visivo, nessun suono negativo, si può riprovare).
- Import relativi (nessun path alias). Gate per ogni task: `npm run check`.
- Nessun file di report dei subagent: solo messaggio finale.

---

### Task 1: Timer preset — Vestirsi, Riordino giochi, Campo libero

**Files:**
- Modify: `src/core/catalog/types.ts` (unione `TimerSession['meal']`, nuovo tipo esportato `TimerKind`)
- Modify: `src/core/storage/envelope.ts` (enum zod del campo `meal`)
- Modify: `src/core/timer/timerMachine.ts` (tipo dell'evento `START`)
- Modify: `src/app/store.ts` (guardia kind-pasto su `mealTimersCompleted` in `commitTimerTransition`)
- Create: `src/features/mealTimer/timerKinds.ts` (mappa copy per kind)
- Modify: `src/features/mealTimer/TimerStart.tsx` (selettore a 5 preset + durate default)
- Modify: `src/features/mealTimer/TimerRun.tsx` (eventuale etichetta pasto → etichetta kind, se presente)
- Modify: `src/features/mealTimer/Celebration.tsx` (messaggio finale per kind)
- Test: `tests/core/storage/envelope.test.ts` (o file esistente equivalente), `tests/features/mealTimer/TimerStart.test.tsx`, `tests/features/mealTimer/Celebration.test.tsx` (estendere i file esistenti se ci sono)

**Interfaces:**
- Produces: `export type TimerKind = 'pranzo' | 'cena' | 'vestirsi' | 'riordino' | 'libero'` in `src/core/catalog/types.ts`; `TimerSession.meal: TimerKind`; evento `START` con `meal: TimerKind`.
- Produces: `src/features/mealTimer/timerKinds.ts`:

```ts
import type { TimerKind } from '../../core/catalog/types';

export interface TimerKindCopy {
  emoji: string;
  /** Etichetta del chip in TimerStart. */
  chip: string;
  /** Testo del bottone di avvio. */
  startButton: string;
  /** Riga sotto "Bravissima!" in Celebration. */
  celebration: string;
  /** Durata di default in minuti (per pranzo/cena si usano comunque settings.meals). */
  defaultMinutes: number;
}

export const TIMER_KINDS: Record<TimerKind, TimerKindCopy> = {
  pranzo:   { emoji: '🍝', chip: 'Pranzo',       startButton: 'Si mangia! 🍝',   celebration: 'Pranzo delizioso! 🍝',        defaultMinutes: 60 },
  cena:     { emoji: '🍽️', chip: 'Cena',         startButton: 'Si mangia! 🍽️',  celebration: 'Cena deliziosa! 🍽️',         defaultMinutes: 60 },
  vestirsi: { emoji: '👕', chip: 'Vestirsi',     startButton: 'Ci vestiamo! 👕', celebration: 'Tutta vestita, che brava! 👕', defaultMinutes: 10 },
  riordino: { emoji: '🧸', chip: 'Riordino',     startButton: 'Si riordina! 🧸', celebration: 'Tutto in ordine! 🧸',          defaultMinutes: 5 },
  libero:   { emoji: '⭐', chip: 'Campo libero', startButton: 'Via! ⭐',         celebration: 'Ce l’abbiamo fatta! ⭐',  defaultMinutes: 15 },
};

export const TIMER_KIND_ORDER: TimerKind[] = ['pranzo', 'cena', 'vestirsi', 'riordino', 'libero'];
```

**Comportamento richiesto:**

1. `types.ts`: aggiungere `TimerKind` e usarlo in `TimerSession.meal` (campo NON rinominato). `timerMachine.ts`: l'evento `START` usa `meal: TimerKind` al posto dell'unione inline. Nessun'altra modifica alla macchina (già agnostica).
2. `envelope.ts`: lo schema zod del timer accetta i 5 valori. Test: un envelope salvato con `meal: 'pranzo'` valida ancora; uno con `meal: 'vestirsi'` valida; uno con `meal: 'merenda'` (valore inventato) viene rifiutato.
3. `store.ts` → `commitTimerTransition`: `mealTimersCompleted` si incrementa solo se `nextTimer.meal === 'pranzo' || nextTimer.meal === 'cena'` (oltre alle condizioni esistenti su `becameCelebrating`). Test unitario/integrazione: completare un timer `vestirsi` NON incrementa il contatore né sblocca `buona-forchetta`; completare un `pranzo` sì (comportamento invariato).
4. `TimerStart.tsx`:
   - Titolo: da "Che si mangia?" a **"Che facciamo?"**.
   - Selettore: 5 chip/bottoni (ordine `TIMER_KIND_ORDER`), stile coerente con gli attuali bottoni Pranzo/Cena (variant primary se selezionato). Su mobile disporli su 2 righe (`flex flex-wrap justify-center gap-3`).
   - Selezione default: il param `?pasto=` continua a funzionare e accetta ora tutti e 5 i valori; senza param vale l'euristica oraria esistente (pranzo/cena).
   - Cambiando kind, `durationMin` si resetta al default del kind (per pranzo/cena da `settings.meals.lunchMinutes`/`dinnerMinutes` come oggi; per gli altri da `TIMER_KINDS[kind].defaultMinutes`). Stepper ±5, range 1–90 e input manuale invariati; la durata resta di sessione (mai scritta nei settings, E3).
   - Bottone di avvio: testo `TIMER_KINDS[kind].startButton`.
5. `TimerRun.tsx`: se mostra da qualche parte "pranzo"/"cena" (etichetta, aria-label…), generalizzare usando `TIMER_KINDS[session.meal].chip`; se non mostra nulla di specifico, nessuna modifica.
6. `Celebration.tsx`: la riga `mealLabel` diventa `TIMER_KINDS[session.meal].celebration`. Il resto (coriandoli, party, bottone) invariato.
7. Test componente TimerStart (estendere il file esistente in `tests/features/mealTimer/`): (a) i 5 chip sono visibili; (b) selezionare "Riordino" porta la durata a 5 min; (c) avviare con "Vestirsi" dispaccia `START` con `meal: 'vestirsi'` e la durata scelta; (d) `?pasto=vestirsi` preseleziona Vestirsi.

- [ ] Scrivere i test (rossi) per envelope, store counter, TimerStart, Celebration
- [ ] Implementare types/envelope/machine/store/timerKinds/UI
- [ ] `npm run check` verde
- [ ] Commit: `feat: timer riusabile con preset vestirsi, riordino giochi e campo libero`

---

### Task 2: Sezione Giochi — infrastruttura (route, menu, griglia, GameShell)

**Files:**
- Create: `src/core/games/types.ts`
- Create: `src/core/games/shuffle.ts`
- Create: `src/features/games/registry.ts`
- Create: `src/features/games/GamesPage.tsx`
- Create: `src/features/games/GameShell.tsx`
- Create: `src/features/games/feedback.ts`
- Modify: `src/app/router.tsx` (route lazy `/giochi/:gameId?`)
- Modify: `src/app/Layout.tsx` (voce "Giochi" dopo Catalogo, prima di Calendario)
- Test: `tests/core/games/shuffle.test.ts`, `tests/features/games/GamesPage.test.tsx`, `tests/features/games/GameShell.test.tsx`

**Interfaces:**
- Consumes: nulla dai task precedenti.
- Produces (contratti usati dai Task 3–6):

```ts
// src/core/games/types.ts
export type Rng = () => number;

/** Round a scelta multipla: `options` contiene sempre `target`, in ordine mescolato, senza duplicati. */
export interface ChoiceRound<T> {
  target: T;
  options: T[];
}
```

```ts
// src/core/games/shuffle.ts — Fisher-Yates puro, non muta l'input
import type { Rng } from './types';
export function shuffle<T>(items: readonly T[], rng: Rng): T[];
/** Estrae `n` elementi distinti a caso da `pool` (n <= pool.length). */
export function sample<T>(pool: readonly T[], n: number, rng: Rng): T[];
```

```tsx
// src/features/games/GameShell.tsx
import type { ReactNode } from 'react';

export interface GameShellProps {
  title: string;
  emoji: string;
  /** Numero di round del gioco; 0 = gioco libero (niente stelle né schermata finale). */
  totalRounds: number;
  /** Round completati finora (0..totalRounds). */
  completedRounds: number;
  /** true quando il gioco è finito: il guscio mostra la schermata finale. */
  finished: boolean;
  onRestart(): void;
  children: ReactNode;
}
export function GameShell(props: GameShellProps): JSX.Element;
```

```ts
// src/features/games/feedback.ts
/** Round giusto: piccolo burst di coriandoli + play('pop') se soundsOn. */
export function celebrateRound(soundsOn: boolean): void;
/** Fine gioco: burst grande + play('party') se soundsOn. */
export function celebrateGameEnd(soundsOn: boolean): void;
```

```ts
// src/features/games/registry.ts
import type { ComponentType } from 'react';
export interface GameDef {
  id: string;      // slug per la route, es. 'tocca-il-colore'
  title: string;
  emoji: string;
  skill: string;   // riga sotto il titolo, es. 'Allena: i colori'
  Component: ComponentType;
}
export const GAMES: GameDef[] = []; // i Task 3–6 aggiungono le voci
```

**Comportamento richiesto:**

1. `Layout.tsx`: `NAV_ITEMS` diventa 6 voci — inserire `{ to: '/giochi', label: 'Giochi', emoji: '🎲' }` tra Catalogo e Calendario; aggiornare il commento "Le 5 destinazioni" → 6. Verificare a occhio che la tab bar a 390px regga 6 voci (label `text-xs` esistente).
2. `router.tsx`: route lazy `{ path: '/giochi/:gameId?', element: withSuspense(<GamesPage />) }` dentro il gruppo `Layout`, stesso pattern `lazy()` delle altre pagine.
3. `GamesPage.tsx`: legge `gameId` da `useParams()`. Senza `gameId` → griglia di card (2 colonne su mobile, 3+ da `lg:`): emoji grande, titolo, riga `skill`; ogni card è un `<Link>` a `/giochi/<id>` (usare `Card`/stile coerente con `CatalogPage`). Con `gameId` valido → render di `<def.Component />`. Con `gameId` sconosciuto → redirect alla griglia (`<Navigate to="/giochi" replace />`). Intestazione griglia: titolo "Giochi 🎲" e sottotitolo "Piccoli giochi da fare insieme, un po' alla volta".
4. `GameShell.tsx`: header con bottone indietro "← Giochi" (`Link` a `/giochi`), emoji+titolo; se `totalRounds > 0` una riga di stelle (`totalRounds` stelle, piene per `completedRounds`, vuote altrimenti — `aria-label` tipo "3 round su 5 completati"); area `children`; quando `finished` → al posto dei children una schermata finale: "Bravissima! 🎉" (font-display grande), stelle tutte piene, bottoni "Gioca ancora" (chiama `onRestart`) e "Altri giochi" (`Link` a `/giochi`). All'ingresso in `finished`, chiamare `celebrateGameEnd(soundsOn)` UNA volta (guardia via ref come in `Celebration.tsx`). `soundsOn` da `useApp((s) => s.settings.meals.soundsOn)`.
5. `feedback.ts`: implementare con `burst` di `src/ui/confetti.ts` e `audioManager` — `celebrateRound`: `burst()` (default piccolo) + `play('pop')`; `celebrateGameEnd`: `burst({ big: true })` + `play('party')`. Controllare la firma reale di `burst` prima di usarla.
6. `shuffle.ts` + test: determinismo con `mulberry32` (import da `../planner/rng`): stesso seed ⇒ stesso ordine; permutazione (stessi elementi); input non mutato; `sample` senza duplicati.
7. Test `GamesPage`: con registry vuoto mostrare comunque la griglia senza crash è inutile — per i test, mockare `GAMES` con 2 voci finte e verificare: griglia con 2 card, click naviga al gioco, `gameId` ignoto redirige. Test `GameShell`: stelle corrette, `finished` mostra "Gioca ancora" che chiama `onRestart`. Guardare i test esistenti in `tests/features/catalog/` per il pattern router/store.

- [ ] Test rossi (shuffle, GamesPage, GameShell)
- [ ] Implementazione (core, registry, pagina, shell, route, nav)
- [ ] `npm run check` verde
- [ ] Commit: `feat: nuova sezione Giochi nel menu con griglia e guscio comune`

---

### Task 3: Giochi a scelta — Tocca il colore, Conta con me, Trova la lettera

**Files:**
- Create: `src/core/games/colorRound.ts`, `src/core/games/countRound.ts`, `src/core/games/letterRound.ts`
- Create: `src/features/games/ToccaIlColore.tsx`, `src/features/games/ContaConMe.tsx`, `src/features/games/TrovaLaLettera.tsx`
- Modify: `src/features/games/registry.ts` (3 voci)
- Test: `tests/core/games/colorRound.test.ts`, `tests/core/games/countRound.test.ts`, `tests/core/games/letterRound.test.ts`, `tests/features/games/ToccaIlColore.test.tsx` (componente: basta questo dei tre, gli altri due seguono lo stesso pattern e hanno i generatori già testati — aggiungere smoke test se economico)

**Interfaces:**
- Consumes: `ChoiceRound<T>`, `Rng`, `shuffle`/`sample`, `GameShell`, `celebrateRound`, registry (Task 2).
- Produces:

```ts
// src/core/games/colorRound.ts
import type { ChoiceRound, Rng } from './types';
export interface GameColor { id: string; label: string; hex: string }
export const GAME_COLORS: GameColor[]; // rosso #FF5D5D, blu #5E7CE2, giallo #FFD166, verde #7BC950, arancione #FF9A3D, viola #9B5DE5, rosa #F49FBC, marrone #8B5E3C
/** 4 opzioni distinte, target incluso. */
export function makeColorRound(rng: Rng): ChoiceRound<GameColor>;
```

```ts
// src/core/games/countRound.ts
export interface CountRound { count: number; emoji: string; options: number[] } // count 1..5, 3 opzioni distinte 1..6 incl. count
export function makeCountRound(rng: Rng): CountRound;
// pool emoji: 🍎 🐟 🌼 🎈 🐤 ⭐ 🍓 🦋
```

```ts
// src/core/games/letterRound.ts
import type { ChoiceRound, Rng } from './types';
/** pool = lettere maiuscole candidate (senza duplicati, >= 3). 3 opzioni distinte, target incluso. */
export function makeLetterRound(rng: Rng, pool: readonly string[]): ChoiceRound<string>;
```

**Comportamento richiesto (pattern comune ai tre — è il pattern di riferimento anche per il Task 4):**

- Ogni gioco è 5 round. Stato locale: `round` corrente (generato con `Math.random` passato come rng), `completedRounds`, `finished`, `wrongId` (per il wiggle).
- Risposta giusta: `celebrateRound(soundsOn)`, +1 stella, dopo ~600ms nuovo round (o `finished` al 5°). Durante quei ~600ms i bottoni sono disabilitati (evita doppi tap).
- Risposta sbagliata: l'opzione sbagliata fa un wiggle orizzontale (framer-motion, solo `x`, saltato con `useReducedMotionPref`), NESSUN suono, il round continua (si può ritentare).
- Generare il round successivo ri-tirando se identico al precedente (stesso target) — un semplice `do/while` con max 5 tentativi.
- Bottoni-opzione: touch target ≥ 64px (`min-h-16 min-w-16` o più grandi), `aria-label` parlante.

**Specifiche per gioco:**

1. **Tocca il colore** (`id: 'tocca-il-colore'`, emoji 🎨→ no, usare 🔴, skill "Allena: i colori"): prompt in alto per l'adulto/bimba "Tocca il **ROSSO**" (nome colore in maiuscolo, testo in colore neutro `text-deep` per non suggerire la risposta); sotto, 4 cerchi pieni (`rounded-full`, ~80px) dei 4 colori delle opzioni, `aria-label={label}`.
2. **Conta con me** (`id: 'conta-con-me'`, emoji 🔢, skill "Allena: i numeri"): in alto `count` emoji ripetute (grandi, `text-5xl`, wrap centrato); prompt "Quanti sono?"; sotto 3 bottoni con le cifre (font-display grande), uno è `count`.
3. **Trova la lettera** (`id: 'trova-la-lettera'`, emoji 🔤, skill "Allena: le lettere"): pool = vocali A E I O U + lettere maiuscole distinte del nome della bimba (`useApp((s) => s.profile?.name ?? '')`, filtrate su A-Z, dedupe; se il totale scende sotto 3 usare solo le vocali); prompt "Trova la **A**"; 3 bottoni con lettere giganti.

**Test generatori (con `mulberry32(seed)`):** opzioni distinte, target incluso, dimensioni giuste (4/3/3), `count` in 1..5 e opzioni in 1..6, determinismo (stesso seed ⇒ stesso round), `makeLetterRound` usa solo lettere del pool. **Test componente ToccaIlColore:** mockare il generatore o iniettare rng deterministico non serve — leggere il prompt renderizzato, cliccare l'opzione con quell'`aria-label`, aspettarsi una stella in più; cliccare un'opzione sbagliata non avanza.

- [ ] Test rossi generatori (+ componente ToccaIlColore)
- [ ] Implementazione 3 generatori + 3 componenti + registry
- [ ] `npm run check` verde
- [ ] Commit: `feat(giochi): tocca il colore, conta con me, trova la lettera`

---

### Task 4: Giochi a scelta — Forme giuste, Grande e piccolo, Trova l'intruso, Cosa viene dopo

**Files:**
- Create: `src/core/games/shapeRound.ts`, `src/core/games/sizeRound.ts`, `src/core/games/oddOneOut.ts`, `src/core/games/sequenceRound.ts`
- Create: `src/features/games/LeFormeGiuste.tsx`, `src/features/games/GrandeEPiccolo.tsx`, `src/features/games/TrovaLIntruso.tsx`, `src/features/games/CosaVieneDopo.tsx`
- Modify: `src/features/games/registry.ts` (4 voci, dopo quelle del Task 3)
- Test: `tests/core/games/shapeRound.test.ts`, `tests/core/games/sizeRound.test.ts`, `tests/core/games/oddOneOut.test.ts`, `tests/core/games/sequenceRound.test.ts`

**Interfaces:**
- Consumes: identico al Task 3 (stesso pattern UI a round descritto lì — rileggerlo: successo/errore/stelle/disabilitazione/anti-ripetizione valgono uguali).
- Produces:

```ts
// src/core/games/shapeRound.ts
import type { ChoiceRound, Rng } from './types';
export type ShapeId = 'cerchio' | 'quadrato' | 'triangolo' | 'stella' | 'cuore' | 'rombo';
export interface ShapeOption { shape: ShapeId; colorHex: string } // colori a caso da GAME_COLORS, anche uguali tra loro
export interface ShapeRound { target: ShapeId; options: ShapeOption[] } // 3 opzioni, forme distinte, target incluso
export function makeShapeRound(rng: Rng): ShapeRound;
```

```ts
// src/core/games/sizeRound.ts
export interface SizeRound {
  emoji: string;                 // pool: 🐘 🐢 🌻 🚗 🧸 🦆
  scales: number[];              // 3 fattori distinti tra 0.5 e 1.5, ordine mescolato
  target: 'max' | 'min';         // alternato/random: "più grande" o "più piccolo"
}
export function makeSizeRound(rng: Rng): SizeRound;
```

```ts
// src/core/games/oddOneOut.ts
export interface OddOneOutRound { items: string[]; oddIndex: number } // 4 emoji: 3 di una categoria + 1 di un'altra, posizione mescolata
export function makeOddOneOutRound(rng: Rng): OddOneOutRound;
// categorie (>=5 emoji l'una): animali 🐶🐱🐭🐰🦊🐻, frutta 🍎🍌🍇🍓🍊🍐, veicoli 🚗🚌🚒🚜🚲✈️, vestiti 👕👗🧦👟🧢🧤
```

```ts
// src/core/games/sequenceRound.ts
import type { Rng } from './types';
export interface SequenceRound {
  shown: string[];               // 4 emoji visibili del pattern (ABAB o AABB), il 5° è la risposta
  answer: string;
  options: string[];             // 2 opzioni distinte, answer inclusa, mescolate
}
export function makeSequenceRound(rng: Rng): SequenceRound;
// coppie A/B pescate da: 🔴🔵, 🌞🌙, 🐟🐙, 🍓🍋, 💛💜 (emoji cerchi/oggetti ben distinguibili)
```

**Specifiche per gioco (tutti 5 round, pattern UI del Task 3):**

1. **Le forme giuste** (`id: 'le-forme-giuste'`, emoji 🔷, skill "Allena: le forme"): in alto la forma target grande (~120px) disegnata in SVG inline con colore fisso `#5E7CE2` e sotto il nome ("Trova il CERCHIO"); sotto 3 bottoni-forma SVG (~90px) coi colori delle opzioni — la corrispondenza è per FORMA, i colori variano apposta. SVG: cerchio `<circle>`, quadrato `<rect rx=8>`, triangolo/stella/cuore/rombo `<path>`/`<polygon>` (nessun asset).
2. **Grande e piccolo** (`id: 'grande-e-piccolo'`, emoji 🐘, skill "Allena: grande e piccolo"): prompt "Tocca il più GRANDE"/"…PICCOLO" secondo `target`; 3 bottoni con la stessa emoji a scale diverse (`style={{ fontSize: 64 * scale }}`), `aria-label` "grande"/"medio"/"piccolo" in base al rango della scala.
3. **Trova l'intruso** (`id: 'trova-l-intruso'`, emoji 🕵️, skill "Allena: la logica"): prompt "Chi non c'entra?"; griglia 2×2 di bottoni emoji grandi; giusto = `oddIndex`.
4. **Cosa viene dopo?** (`id: 'cosa-viene-dopo'`, emoji 🔁, skill "Allena: le sequenze"): riga con le 4 emoji `shown` + un riquadro "?" tratteggiato; sotto 2 bottoni-opzione. Giusto = `answer`.

**Test generatori:** determinismo col seed; vincoli strutturali (3 forme distinte con target incluso; 3 scale distinte in [0.5,1.5]; l'intruso è davvero di categoria diversa dagli altri 3 e `oddIndex` coerente; il pattern ABAB/AABB è coerente e `answer` è il 5° elemento corretto; opzioni distinte con answer inclusa).

- [ ] Test rossi 4 generatori
- [ ] Implementazione 4 generatori + 4 componenti + registry
- [ ] `npm run check` verde
- [ ] Commit: `feat(giochi): forme giuste, grande e piccolo, trova l'intruso, cosa viene dopo`

---

### Task 5: Giochi con stato — Memoria degli animali, Dal più piccolo al più grande

**Files:**
- Create: `src/core/games/memoryDeck.ts`, `src/core/games/orderRound.ts`
- Create: `src/features/games/MemoriaDegliAnimali.tsx`, `src/features/games/DalPiccoloAlGrande.tsx`
- Modify: `src/features/games/registry.ts` (2 voci)
- Test: `tests/core/games/memoryDeck.test.ts`, `tests/core/games/orderRound.test.ts`, `tests/features/games/MemoriaDegliAnimali.test.tsx`

**Interfaces:**
- Consumes: `Rng`, `shuffle`/`sample`, `GameShell`, `celebrateRound` (Task 2); pattern feedback del Task 3 (wiggle/nessun suono negativo).
- Produces:

```ts
// src/core/games/memoryDeck.ts
export interface MemoryCard { id: number; emoji: string } // 6 carte = 3 coppie, mescolate; id 0..5 stabile per la UI
export function makeMemoryDeck(rng: Rng): MemoryCard[];
// pool animali: 🐶 🐱 🐰 🦁 🐸 🐷 🐤 🐠 🦋 🐢 (sample di 3, duplicati in coppie, shuffle)
```

```ts
// src/core/games/orderRound.ts
export interface OrderRound { emoji: string; scales: number[] } // 3 scale distinte in [0.5, 1.5], ordine mescolato; si vince toccando in ordine crescente di scala
export function makeOrderRound(rng: Rng): OrderRound;
// pool emoji: 🐘 🌳 🏠 🐟 🌸 🚗
```

**Specifiche per gioco:**

1. **Memoria degli animali** (`id: 'memoria-degli-animali'`, emoji 🐘→ usare 🃏? no, usare 🐾, skill "Allena: la memoria"): griglia 3×2 di carte (~90px, `rounded-2xl`). Carta coperta: dorso `bg-sky/40` con "🌟"; scoperta: emoji grande su `bg-card`. Logica: max 2 carte girate; se combaciano → restano scoperte + `celebrateRound`; se no → dopo ~900ms si richiudono (durante l'attesa le altre carte sono disabilitate), nessun suono. Vittoria = 3 coppie trovate → `finished` (GameShell). `totalRounds=3`, `completedRounds`=coppie trovate. Il flip è una transizione `transform`/`opacity` (scale/fade bastano; con `useReducedMotionPref` cambio istantaneo). "Gioca ancora" rigenera il mazzo.
2. **Dal più piccolo al più grande** (`id: 'dal-piccolo-al-grande'`, emoji 📏, skill "Allena: mettere in ordine"): 5 round. Per round: 3 bottoni con la stessa emoji a scale diverse (come Grande e piccolo), prompt "Tocca dal più PICCOLO al più GRANDE"; la bimba deve toccarli in ordine crescente di scala. Tocco giusto: il bottone si "accende" (bordo `border-leaf`, numerino 1/2/3 sopra) e si disabilita; completati tutti e 3 → round vinto (`celebrateRound`, +1 stella, nuovo round dopo ~600ms). Tocco sbagliato: wiggle su quel bottone e si azzera SOLO il progresso del round corrente (i già-accesi si spengono), si riprova.

**Test:** `makeMemoryDeck` — 6 carte, esattamente 3 coppie, determinismo, shuffle effettivo (seed diversi ⇒ ordini diversi almeno per un caso); `makeOrderRound` — 3 scale distinte in range, determinismo. Componente Memoria: girare 2 carte uguali le lascia scoperte e incrementa le coppie; girarne 2 diverse le richiude (usare `vi.useFakeTimers` per i 900ms, o meglio: iniettare il deck mockando il generatore per avere posizioni note — scegliere l'approccio già usato nei test esistenti per il mocking dei moduli core).

- [ ] Test rossi (2 generatori + componente Memoria)
- [ ] Implementazione
- [ ] `npm run check` verde
- [ ] Commit: `feat(giochi): memoria degli animali e dal piu' piccolo al piu' grande`

---

### Task 6: Disegna col dito + e2e della sezione Giochi

**Files:**
- Create: `src/features/games/DisegnaColDito.tsx`
- Modify: `src/features/games/registry.ts` (10ª voce — l'ordine finale della griglia: tocca-il-colore, conta-con-me, le-forme-giuste, grande-e-piccolo, trova-l-intruso, cosa-viene-dopo, memoria-degli-animali, dal-piccolo-al-grande, trova-la-lettera, disegna-col-dito)
- Create: `e2e/giochi.spec.ts`
- Test: `tests/features/games/DisegnaColDito.test.tsx`

**Interfaces:**
- Consumes: `GameShell` con `totalRounds={0}` (modalità gioco libero, Task 2), registry.

**Specifiche — Disegna col dito** (`id: 'disegna-col-dito'`, emoji 🎨, skill "Allena: la fantasia"):
- `<canvas>` a tutta larghezza (altezza ~60vh, sfondo `#FFFFFF`, `rounded-2xl`, `touch-action: none`), disegno con Pointer Events (`pointerdown/move/up`, `setPointerCapture`), tratto `lineCap/lineJoin: 'round'`, spessore ~10px.
- Gestire `devicePixelRatio`: dimensionare il buffer del canvas a `cssSize * dpr` e scalare il contesto, altrimenti il tratto è sgranato.
- Palette: 6 pallini colore (da `GAME_COLORS`: rosso, blu, giallo, verde, viola, marrone) + gomma (⚪ traccia in bianco, spessore 3×) — pallino selezionato con anello `ring`. Bottone "Ricomincia 🧽" che pulisce tutto (tap semplice, il genitore è accanto — niente conferma).
- Al resize della finestra è accettabile perdere il disegno (ridimensionare = pulire): documentarlo in un commento.
- Niente stelle/fine: `totalRounds={0}`, si esce col back del GameShell.
- Test componente: smoke — canvas presente, palette con 7 controlli, click su "Ricomincia" non crasha (jsdom non implementa il 2D context: mockare `HTMLCanvasElement.prototype.getContext` nel test, pattern standard).

**Specifiche — `e2e/giochi.spec.ts`** (viewport mobile di default del progetto):
1. Da `/oggi`, la tab "Giochi" è visibile nella tab bar → tap → si arriva alla griglia con 10 card.
2. Tap su "Tocca il colore" → leggere il nome del colore dal prompt (regex su "Tocca il (\w+)") → tap sul cerchio con quell'`aria-label` → la riga stelle passa a "1 round su 5 completati". (Il target è leggibile dall'aria-label: nessun bisogno di rng deterministico.)
3. Tap su "← Giochi" → di nuovo la griglia.
4. Navigazione diretta a `/giochi/qualcosa-che-non-esiste` → redirect alla griglia.

- [ ] Test rossi (componente) + implementazione DisegnaColDito + registry completo
- [ ] Scrivere `e2e/giochi.spec.ts` e farlo passare (`npx playwright test e2e/giochi.spec.ts`)
- [ ] `npm run check` verde
- [ ] Commit: `feat(giochi): disegna col dito e test e2e della sezione giochi`

---

## Self-review (fatta)

- **Copertura:** richiesta utente = timer per vestirsi/riordino/campo libero (Task 1) + voce menu dopo Catalogo prima di Calendario (Task 2) + 10 giochi educativi (Task 3: 3, Task 4: 4, Task 5: 2, Task 6: 1 — totale 10). ✔
- **Coerenza interfacce:** `ChoiceRound`/`Rng`/`shuffle`/`sample` definiti nel Task 2 e consumati identici nei Task 3–5; `GameShellProps` unico; gli id-slug del registry coincidono tra Task 3–6 e l'ordine finale nel Task 6. ✔
- **Vincoli:** nessun import features→core invertito; rng sempre parametro nei generatori (la UI passa `Math.random`); nessun secondo orologio nel timer; campo `meal` non rinominato. ✔
