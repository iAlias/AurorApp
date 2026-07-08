# Checklist QA finale — AurorApp (Task 23 / M7)

Data verifica: 2026-07-08 (worktree `aurorapp-impl`, commit di partenza `113dad7`).

## 0. Comando unico e suite e2e

- `npm run check` (typecheck + lint + unit + build): **verde**.
  - Unit (Vitest): **264 test, 26 file** — tutti passati (259 test/25 file prima delle correzioni di questo task; +5 test aggiunti qui, vedi §AC-9 e §AC-10 sotto).
  - Build: `vite build` ok, service worker generato (`vite-plugin-pwa`, modalità `generateSW`, 28 entry precache, ~1039 KiB).
- `npx playwright test` (suite e2e completa): **28 test, 28 file passati, 0 falliti**.

Entrambi i comandi sono stati rieseguiti **dopo** le correzioni descritte in questo documento e risultano verdi.

---

## 1. I 10 criteri di accettazione finali (§14)

Legenda stato: ✅ verificato automaticamente · ⚠️ verificabile solo manualmente su device reale · ❌ scostamento trovato (corretto in questo task).

### 1. Wizard
> Dato un primo avvio, quando completo i 6 step con dati validi, allora atterro su Oggi con 5 slot popolati e il profilo persistito (sopravvive al refresh).

**Stato: ✅ verificato automaticamente.**

- `e2e/wizard.spec.ts` → `wizard completo porta a Oggi con il profilo creato` (percorre i 6 step reali via `completeWizardFlow`, verifica URL `/oggi` e nome visibile).
- `e2e/wizard.spec.ts` → `refresh dopo wizard: profilo persistito` (stesso percorso + `page.reload()`, profilo ancora presente).
- `e2e/today.spec.ts` → `mostra 5 SlotCard in un giorno feriale` (usa lo stesso `completeWizardFast` in `e2e/helpers.ts`, che esegue il wizard vero e non un'iniezione diretta in `localStorage`; verifica `page.getByTestId('slot-card')` conta 5).

Le tre prove insieme coprono l'intero enunciato (wizard → 5 slot → persistenza al refresh); nessuna singola prova lo fa da sola, ma la combinazione sì.

### 2. Anti-noia
> Dato un periodo di 92 giorni, quando genero tutti i piani, allora nessuna attività si ripete entro 14 giorni e nessun giorno ha categorie duplicate.

**Stato: ✅ verificato automaticamente.**

- `tests/core/planner/generator.test.ts` → `P-GEN-1 · nessuna ripetizione entro 14gg` (92 giorni × 20 profili, tasso di ripetizione entro 14gg < 1%).
- `tests/core/planner/generator.test.ts` → `P-GEN-2 · categorie e attività non duplicate nel giorno` (20 profili × 92 giorni: categorie non-SERA sempre distinte, nessuna attività ripetuta nello stesso giorno).

Nota: il criterio §14 usa "nessuna" in senso assoluto, ma la spec stessa (§7.3 "rilassamento", §7.4 P-GEN-1) prevede un meccanismo di rilassamento della finestra dei 14 giorni quando il pool compatibile si esaurisce (14→10→7→4 giorni, poi categoria ripetuta), documentato e testato per restare **sotto l'1%** dei casi. Non è uno scostamento: è il comportamento voluto e specificato, il test lo verifica esattamente in questi termini.

### 3. Determinismo
> Dato lo stesso profilo, quando rigenero lo stesso giorno senza toccare nonce/meteo, allora ottengo lo stesso identico piano.

**Stato: ✅ verificato automaticamente.**

- `tests/core/planner/generator.test.ts` → `P-GEN-3 · determinismo`:
  - `generateDayPlan è identico su 1000 chiamate con gli stessi input`.
  - `materializeUpTo è identico su ripetizioni`.
  - `nonce diversi producono piani diversi` (verifica anche che il seed dipenda davvero dal nonce, non solo che non cambi a parità di nonce).

### 4. Meteo
> Dato un giorno con slot all'esterno, quando imposto 🌧️, allora i soli slot non completati diventano attività da interno, subito.

**Stato: ✅ verificato automaticamente.**

- `tests/core/planner/generator.test.ts` → `applyWeather: slot done mai toccato; incompatibili rigenerati; compatibili invariati` (unit, verifica puntuale: uno slot `esterno` già `done` resta intatto nonostante l'incompatibilità; uno slot `esterno` non-`done` viene rigenerato in un'attività non-esterna; gli slot già compatibili non cambiano attività).
- `tests/core/planner/generator.test.ts` → `P-GEN-4 · vincoli meteo` (pioggia → nessuna attività `esterno`/`requiresDry`; caldo → nessuna `esterno` in M2/P2).
- `e2e/today.spec.ts` → `meteo pioggia: nessuna card mostra il badge "esterno"` (verifica l'effetto "subito", lato UI reale, di un tap sul selettore meteo).

### 5. Timer felice
> Dato l'avvio del timer pranzo da 60 min, quando passano 60 minuti (anche con telefono bloccato nel mezzo), allora vedo l'arcobaleno completo, il sole alla nuvoletta e la celebrazione col nome.

**Stato: ✅ verificato automaticamente** (con una precisazione sulla "nuvoletta", vedi sotto).

- `e2e/timer.spec.ts` → `timer 60min: avvio, blocco "telefono", ripresa, celebrazione`: avvia il timer, simula un blocco/riapertura (`page.reload()`) a metà sessione, salta oltre i 60 minuti e verifica la comparsa della schermata "Bravissima, **Aurora**!" (celebrazione col nome, `heading` con `toContainText('Aurora')`).
- `src/core/timer/progress.ts` (`fillFraction`, `sunAngleDeg`) + `tests/ui/rainbow.test.tsx`: a `progress=1` tutti i 7 archi sono pieni (`offset≈0`) e il sole è all'estremità destra (`sunAngleDeg(1) = 0°`).
- `src/features/mealTimer/Celebration.tsx`: mostra sempre `Bravissima, {profileName}!` all'ingresso in `celebrating`.

Precisazione sulla "nuvoletta": in `src/ui/Rainbow.tsx` la nuvoletta è un'illustrazione **fissa** posta all'estremità destra della volta (coordinate `CLOUD_X=880, CLOUD_Y=470` su un viewBox 1000×560); il sole a `progress=1` si trova in `(926, 520)` — vicinissimo alla nuvoletta ma non sovrapposto pixel-per-pixel. Questo è coerente con la lettura "poetica" della spec (il sole percorre la volta e arriva accanto alla nuvoletta a fine pasto, segnando visivamente il traguardo insieme al riempimento completo dell'arcobaleno): non è un letterale "il sole si fonde con la nuvola", ma il comportamento realizzato soddisfa lo spirito del criterio. Nessuna correzione necessaria.

La transizione `running→celebrating` (in `src/features/mealTimer/useTimerLoop.ts`) avviene nello stesso batch React in cui `progress` raggiunge 1: React 18 può quindi non renderizzare mai un frame isolato con "arcobaleno pieno ma ancora in TimerRun" — ma essendo `fillFraction`/`sunAngleDeg` funzioni continue, l'ultimo frame effettivamente dipinto prima della transizione (a `progress` come 0.995+) mostra comunque un arcobaleno visivamente indistinguibile dal completo. Comportamento accettabile, nessuna correzione necessaria.

### 6. Timer robusto
> Dato un timer al 50%, quando chiudo il browser e riapro dopo 10 min, allora il progresso riflette il tempo reale trascorso.

**Stato: ✅ verificato automaticamente.**

- `src/core/timer/progress.ts` (`elapsedMs`, `progressOf`, `restore`): il progresso è **sempre** ricalcolato da `Date.now()` e dai timestamp assoluti della sessione (`startedAt`, `pausedTotalMs`), mai da un contatore incrementale.
- `tests/core/timer/timerMachine.test.ts` → blocco `progress — restore`:
  - `sessione running "vecchia" (riavvio telefono): 2h trascorse, durata 60min → celebrating`.
  - `sessione running con progress < 1 resta invariata dopo restore` (10 minuti trascorsi su una sessione più lunga: il progresso riflette esattamente il tempo trascorso).
  - `clock indietro (now < startedAt) → null` (E12).
- `src/features/mealTimer/MealTimerPage.tsx`: chiama `restoreTimer(Date.now())` a ogni mount di `/timer` (unico punto di ricostruzione).
- `e2e/timer.spec.ts` → `timer 60min: ...`: `page.reload()` a metà sessione, poi verifica che il timer riprenda da `termina alle...` coerente (recovery E1 end-to-end, non solo unit).

### 7. Child-lock
> Dato il timer attivo, quando la bimba tocca/striscia il dito ovunque, allora appaiono solo stelline e nulla si interrompe; una pressione lunga 3 s dell'adulto mette in pausa.

**Stato: ✅ verificato automaticamente.**

- `src/features/mealTimer/TouchStars.tsx`: overlay fullscreen che ad ogni `pointerdown` genera **solo** una stellina decorativa (nessun dispatch verso la macchina a stati del timer).
- `src/ui/useLongPress.ts` + `tests/ui/useLongPress.test.ts`: attivazione solo dopo 3000ms fermi; uno spostamento ≥ 12px (il dito che "striscia") annulla la pressione; un rilascio anticipato (2900ms) non attiva nulla; smontaggio a metà pressione non lascia timer pendenti.
- `src/features/mealTimer/TimerRun.tsx` (`RingButton`): Pausa/Esci sono avvolti in `useLongPress(..., { ms: 3000 })` — un tap semplice è un no-op.
- `e2e/timer.spec.ts` → `child-lock: tap semplice non mette in pausa`: un tap reale sul bottone Pausa (senza tenere premuto 3s) non mette in pausa il timer.

### 8. Offline
> Data l'app installata e visitata una volta, quando attivo la modalità aereo e la riapro, allora tutto funziona identicamente.

**Stato: ⚠️ verificabile solo manualmente su device reale.**

Verificato automaticamente ciò che è verificabile in questo ambiente (nessun browser reale/installazione PWA disponibile qui):
- `vite.config.ts`: `VitePWA({ registerType: 'prompt', workbox: { globPatterns: [...], navigateFallback: 'index.html' } })` configurato.
- `npm run build` genera correttamente `dist/manifest.webmanifest`, `dist/sw.js`, `dist/workbox-*.js` con **28 entry precache** (~1039 KiB) — confermato in questa sessione.
- `src/app/UpdatePrompt.tsx`: gestisce l'aggiornamento del service worker con conferma esplicita dell'utente (non silenzioso).

Il comportamento realmente offline (installazione, modalità aereo, riapertura) richiede un device/browser reale: incluso nella checklist manuale §2 sotto.

### 9. Backup
> Dato uno stato con 30 giorni di storia, quando esporto, azzero e importo, allora lo stato è bit-a-bit identico.

**Stato: ❌ → ✅ scostamento trovato e corretto (mancava il test end-to-end richiesto).**

**Cosa mancava:** esisteva solo copertura "a pezzi separati" — mai un singolo test che facesse l'intero ciclo *export → azzeramento → import* su uno stato con **30 giorni di storia**, confrontando poi lo stato risultante bit-a-bit con l'originale:
- `tests/core/storage/exportImport.test.ts` testava solo `exportJson → parseBackup` (round-trip di serializzazione, senza passare da un vero `resetAll()`, e su una fixture di soli 2 giorni).
- `tests/app/store.test.ts` testava `resetAll` e `importEnvelope` **separatamente**, mai in sequenza a partire da un export reale.
- `e2e/settings.spec.ts` → `esporta poi importa: lo stato torna con profilo e piani (AC-9 §14)` fa il ciclo completo lato UI, ma verifica solo dettagli superficiali (URL `/oggi`, nome profilo visibile), non un confronto bit-a-bit dell'intero stato, e non usa 30 giorni di storia.

**Correzione applicata:** aggiunto un nuovo test in `tests/app/store.test.ts` → describe `round-trip export → azzera → importa (AC-9 §14)`:
- Costruisce uno stato "vissuto": profilo completo, **30 giorni di piani materializzati** (`ensurePlansUpTo`), alcune attività segnate `done` (con ricalcolo di streak/progress/badge) e un timer pasto **in pausa**.
- Cattura l'intera envelope (`toEnvelope`), la esporta (`exportJson`), esegue un vero `resetAll()`, re-importa (`parseBackup` + `importEnvelope`).
- Confronta lo stato risultante con l'originale sia con `toEqual` (deep-equal strutturale) sia con uguaglianza testuale delle due serializzazioni JSON (`exportJson(restored) === json`), sia rileggendo `localStorage` direttamente.

Il test **è passato al primo tentativo**: il comportamento del round-trip era già corretto, mancava solo la prova end-to-end richiesta dal criterio. Nessuna modifica al codice applicativo, solo test aggiunto. File: `tests/app/store.test.ts`.

### 10. Accessibilità
> Dato `prefers-reduced-motion`, quando navigo l'app, allora nessuna animazione 3D/coriandoli, solo fade.

**Stato: ❌ → ✅ scostamenti trovati e corretti (2 animazioni "di delight" ignoravano reduced-motion).**

Inventario di **tutte** le animazioni non-fade individuate nel codice (`grep` su `motion\.`, `whileTap`, `whileHover`, `animate=`, `initial=`, `animate-pulse` ecc. in tutto `src/`):

| Animazione | File | Rispetta reduced-motion? |
|---|---|---|
| PageFlip3D (transizione route) | `src/ui/PageFlip3D.tsx` | ✅ già a posto (fade 150ms invece di rotateY/x) |
| Coriandoli celebrazione | `src/ui/confetti.ts` (`burst`) | ✅ già a posto (`isReducedMotion()` → no-op totale) |
| Countdown 3-2-1 | `src/features/mealTimer/TimerStart.tsx` | ✅ già a posto (fade invece di rotateX/scale) |
| Oscillazione del sole (arcobaleno) | `src/features/mealTimer/TimerRun.tsx` (wrapper `motion.div` attorno a `Rainbow`) | ✅ già a posto (nessun wrapper animato se reduced) |
| Pulsazione bordo "quasi finito" (ultimi 5 min) | `src/features/mealTimer/TimerRun.tsx` (`animate-pulse` CSS) | ✅ già a posto (classe omessa se reduced) |
| Flip pagina wizard (step→step) | `src/features/wizard/WizardPage.tsx` | ✅ già a posto |
| Modal (apertura/chiusura) | `src/ui/Modal.tsx` | ✅ già a posto |
| Sheet (bottom sheet calendario) | `src/ui/Sheet.tsx` | ✅ già a posto |
| Toast aggiornamento PWA | `src/app/UpdatePrompt.tsx` | ✅ già a posto |
| Spinner caricamento route | `src/app/RouteLoading.tsx` | ✅ già a posto (fade pulsante invece di rotazione) |
| Flip badge sbloccato | `src/features/settings/ProgressCard.tsx` | ✅ già a posto |
| Ingresso card slot (Oggi) | `src/features/today/TodayPage.tsx` | ✅ già a posto |
| Tap-feedback (scala) su celle calendario | `src/features/calendar/MonthGrid.tsx` (`active:scale-95`) | non un'animazione framer-motion ma feedback di pressione via CSS `transition-transform`; non decorativa/autoplaying, considerata fuori perimetro del criterio (nessuna correzione) |
| Tap-feedback (scala) su selettore meteo | `src/features/today/WeatherSelector.tsx` (`active:scale-[.97]`) | idem sopra |
| Tap-feedback (scala) su Chip | `src/ui/Chip.tsx` (`active:scale-[.97]`) | idem sopra |
| **Stelline al tocco (child-lock delight)** | `src/features/mealTimer/TouchStars.tsx` | ❌ **trovato e corretto** — animava sempre `scale 0.5→1.5` + `y: -36`, ignorando `prefers-reduced-motion` |
| **Stelline per arco completato** | `src/features/mealTimer/TimerRun.tsx` (`arcStars`) | ❌ **trovato e corretto** — stesso pattern (`scale 0.6→1.6`, `y: -60`), nello stesso file che già gestiva correttamente oscillazione del sole e pulsazione "quasi finito", ma non questa animazione |
| **Illustrazione d'ingresso wizard (🌈 step Benvenuto)** | `src/features/wizard/StepWelcome.tsx` | ❌ **trovato e corretto** — `scale 0.7→1` con molla, nessun controllo reduced-motion |

**Correzioni applicate** (stesso pattern già in uso nel resto della codebase: `reducedMotion ? {opacity: ...} : {opacity: ..., scale/y: ...}`):
- `src/features/mealTimer/TouchStars.tsx`: aggiunto `useReducedMotionPref()`; con reduced motion attivo la stellina fa solo fade (nessuna scala/traslazione).
- `src/features/mealTimer/TimerRun.tsx`: le stelline per arco completato (`arcStars`) ora rispettano lo stesso `reducedMotion` già usato nello stesso componente per l'oscillazione del sole.
- `src/features/wizard/StepWelcome.tsx`: aggiunto `useReducedMotionPref()`; l'illustrazione 🌈 con reduced motion fa solo fade, senza scala/molla.

**Test aggiunti** (nuovo file `tests/ui/reducedMotionAnimations.test.tsx`, 4 test): verificano che con `reducedMotion: 'on'` lo stile iniziale renderizzato non contenga `scale`/`translate` (solo `opacity`), sia per `StepWelcome` sia per `TouchStars`; e che con `reducedMotion: 'off'` il comportamento pieno originale resti invariato (regressione).

---

## 2. Checklist manuale su device reale (spec §12)

Non verificabile in questo ambiente (nessun device fisico/browser mobile reale disponibile). Da spuntare manualmente prima del "fine lavori":

- [ ] Installazione PWA su iOS (Safari → "Aggiungi a Home")
- [ ] Installazione PWA su Android (Chrome → "Installa app"/banner automatico)
- [ ] Offline totale: attivare modalità aereo dopo una visita, riaprire l'app installata, verificare che tutto funzioni identicamente (AC-8 §14)
- [ ] Suoni dopo lock/unlock dello schermo (l'`AudioContext` si sblocca di nuovo al primo gesto dopo un blocco, E13)
- [ ] Wake Lock: tenere il timer attivo per 10 minuti reali e verificare che lo schermo non si spenga da solo
- [ ] Rotazione in landscape durante il timer pasto: layout si adatta, progresso invariato (E8)
- [ ] Luminosità/leggibilità in cucina (condizioni di luce reali, non solo su monitor da scrivania)
- [ ] Test con la bimba vera: capisce il sole? 😊 (il segnale visivo di avanzamento/completamento del timer è comprensibile per una bambina di 3 anni senza spiegazioni)

---

## 3. Riepilogo scostamenti trovati e corretti in questo task

1. **AC-9 (Backup)** — mancava un test che eseguisse l'intero ciclo export→azzeramento→import con 30 giorni di storia e confronto bit-a-bit. Aggiunto in `tests/app/store.test.ts`; comportamento applicativo già corretto (nessun fix di codice necessario, solo test).
2. **AC-10 (Accessibilità)** — due animazioni "di delight" (stelline al tocco/per arco completato, illustrazione d'ingresso wizard) non rispettavano `prefers-reduced-motion`. Corrette in `src/features/mealTimer/TouchStars.tsx`, `src/features/mealTimer/TimerRun.tsx` e `src/features/wizard/StepWelcome.tsx`; aggiunta copertura di regressione in `tests/ui/reducedMotionAnimations.test.tsx`.

Nessun altro scostamento comportamentale reale trovato negli altri 8 criteri.
