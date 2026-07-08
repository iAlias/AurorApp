import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { format } from 'date-fns';
import type {
  BadgeId,
  ChildProfile,
  DayPlan,
  MealSettings,
  ProgressState,
  RoutineSettings,
  Settings,
  SlotId,
  SlotStatus,
  StorageEnvelope,
  TimerSession,
  Weather,
} from '../core/catalog/types';
import { ACTIVITIES } from '../core/catalog/activities';
import { STORAGE_KEY, emptyEnvelope } from '../core/storage/envelope';
import { loadEnvelope, makeDebouncedSave, saveNow } from '../core/storage/persist';
import { next } from '../core/timer/timerMachine';
import type { TimerEvent } from '../core/timer/timerMachine';
import { restore } from '../core/timer/progress';
import { checkUnlocks } from '../core/progress/badges';
import {
  applyWeather,
  generateDayPlan,
  isFamilyDay,
  materializeUpTo,
  regenerateDay,
  swapActivity,
} from '../core/planner/generator';
import type { GenContext } from '../core/planner/generator';

/** "Oggi" secondo l'orologio di sistema, in ISO `yyyy-MM-dd` (fonte per streak/badge). */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ——— Stato di idratazione ———
export type StorageStatus = 'ready' | 'corrupted';

export interface AppStore extends StorageEnvelope {
  storageStatus: StorageStatus;
  corruptedRaw: string | null;
  /**
   * Badge appena sbloccati dall'ultima azione che ha ricalcolato il
   * progresso (`markSlot`/`timerDispatch`), non persistiti (canale
   * effimero solo per la UI corrente): la UI li legge per mostrare
   * Modal+play('badge')+burst e poi li consuma con `clearNewBadges`. Se
   * arriva un nuovo sblocco prima che il precedente sia stato consumato,
   * l'array si sostituisce (non si accumula) — evento raro (richiede due
   * sblocchi nella stessa manciata di secondi) e comunque la UI successiva
   * mostrerebbe entrambi solo se li accumulasse in coda, complessità non
   * giustificata qui.
   */
  lastNewBadges: BadgeId[];
  clearNewBadges(): void;
  completeWizard(profile: ChildProfile, routine: RoutineSettings): void;
  updateSettings(
    patch: Partial<Settings> | { routine?: Partial<RoutineSettings>; meals?: Partial<MealSettings> },
  ): void;
  importEnvelope(env: StorageEnvelope): void;
  resetAll(): void;
  timerDispatch(e: TimerEvent): void;
  restoreTimer(now: number): void;
  ensurePlansUpTo(dateISO: string): void;
  markSlot(dateISO: string, slotId: SlotId, status: SlotStatus): void;
  swapSlot(dateISO: string, slotId: SlotId): { exhausted: boolean };
  setSlotActivity(dateISO: string, slotId: SlotId, activityId: string): void;
  regenerate(dateISO: string): void;
  regenerateFutureFromToday(): void;
  setWeather(dateISO: string, w: Weather): void;
  setSpecial(dateISO: string, special: DayPlan['special'] | undefined): void;
}

/**
 * Estrae i soli campi persistibili (StorageEnvelope) da uno stato che li
 * contiene. Esportata perché `DataSection` (Task 20, FR-8 Dati) la riusa per
 * costruire l'envelope da esportare, invece di duplicarne la forma.
 */
export function toEnvelope(state: StorageEnvelope): StorageEnvelope {
  return {
    schemaVersion: state.schemaVersion,
    savedAt: state.savedAt,
    profile: state.profile,
    settings: state.settings,
    plans: state.plans,
    progress: state.progress,
    timer: state.timer,
  };
}

/**
 * Store applicativo unico. Idratazione sincrona alla creazione:
 * `loadEnvelope(localStorage)` — se `ok:false` (JSON illeggibile o non
 * valido) l'app non lancia mai: parte comunque con un'envelope vuota in RAM
 * e `storageStatus:'corrupted'`, con il dato grezzo conservato in
 * `corruptedRaw` per un eventuale recupero (E5).
 */
export const useApp: UseBoundStore<StoreApi<AppStore>> = create<AppStore>((set, get) => {
  const hydration = loadEnvelope(localStorage);
  const initialEnv = hydration.ok ? hydration.env : emptyEnvelope();
  const initialStatus: StorageStatus = hydration.ok ? 'ready' : 'corrupted';
  const initialCorruptedRaw = hydration.ok ? null : hydration.raw;

  /**
   * Applica una nuova sessione timer (venga da `next()` o da `restore()`) e
   * la scrive SUBITO su localStorage (write-through, non debounced — il
   * timer pasto e' l'unico dominio dello store con questo requisito
   * esplicito). Se la transizione porta a `celebrating` da uno stato che
   * non lo era già, incrementa `progress.mealTimersCompleted` una sola
   * volta (idempotenza E4: eventi/ricostruzioni non validi ritornano la
   * stessa identità di riferimento da `next`/`restore`, quindi qui sopra
   * non arrivano mai) e ricalcola streak/doneByCategory/badge (Task 18):
   * un pasto completato può sbloccare 'buona-forchetta'. I preset non-pasto
   * (vestirsi/riordino/libero) diventano 'celebrating' allo stesso modo ma
   * NON contano come pasto: 'buona-forchetta' resta legato solo a pranzo/cena.
   */
  function commitTimerTransition(nextTimer: TimerSession | null, prevStatus: TimerSession['status'] | null): void {
    const state = get();
    const becameCelebrating =
      nextTimer !== null && nextTimer.status === 'celebrating' && prevStatus !== 'celebrating';
    const isMealKind = nextTimer !== null && (nextTimer.meal === 'pranzo' || nextTimer.meal === 'cena');
    // Una sessione con status:'done' equivale a "nessuna sessione attiva":
    // non va mai persistita come tale, altrimenti dopo CELEBRATION_DONE
    // l'oggetto 'done' resterebbe in store.timer per sempre e un mount
    // successivo di /timer (es. per il pasto seguente) lo tratterebbe come
    // sessione da mostrare invece che come nessuna sessione, bloccando
    // l'avvio di un nuovo timer.
    const timerToPersist = nextTimer !== null && nextTimer.status === 'done' ? null : nextTimer;

    let newProgress: ProgressState = state.progress;
    let newBadges: BadgeId[] = [];
    if (becameCelebrating && isMealKind) {
      const bumped: ProgressState = {
        ...state.progress,
        mealTimersCompleted: state.progress.mealTimersCompleted + 1,
      };
      const unlocked = checkUnlocks(bumped, state.plans, ACTIVITIES, todayISO(), new Date().toISOString());
      newProgress = unlocked.state;
      newBadges = unlocked.newBadges;
    }

    const env: StorageEnvelope = {
      ...toEnvelope(state),
      savedAt: new Date().toISOString(),
      timer: timerToPersist,
      progress: newProgress,
    };
    saveNow(localStorage, env);
    set((s) => ({
      timer: env.timer,
      progress: env.progress,
      savedAt: env.savedAt,
      lastNewBadges: newBadges.length > 0 ? newBadges : s.lastNewBadges,
    }));
  }

  /**
   * Contesto per le funzioni pure del generatore (Task 12). `null` se il
   * wizard non è ancora stato completato: senza profilo non esiste una
   * `vacationStart`/seed su cui basare alcuna generazione, quindi le azioni
   * piani diventano no-op sicuri (la UI chiamante evita comunque di
   * invocarle prima del wizard).
   */
  function genCtx(state: StorageEnvelope): GenContext | null {
    if (!state.profile) return null;
    return { profile: state.profile, settings: state.settings, catalog: ACTIVITIES, plans: state.plans };
  }

  /** Scrive subito su localStorage (write-through) i piani aggiornati e aggiorna lo stato. */
  function commitPlans(state: StorageEnvelope, plans: Record<string, DayPlan>): void {
    const env: StorageEnvelope = {
      ...toEnvelope(state),
      savedAt: new Date().toISOString(),
      plans,
    };
    saveNow(localStorage, env);
    set({ plans: env.plans, savedAt: env.savedAt });
  }

  /**
   * Come `commitPlans`, ma ricalcola anche `progress` (streak/doneByCategory/
   * badge, Task 18) dai piani aggiornati — fonte di verità, non incrementale
   * — e scrive entrambi in un solo write-through. Se emergono nuovi badge li
   * espone in `lastNewBadges` perché la UI li mostri.
   */
  function commitPlansAndProgress(state: StorageEnvelope, plans: Record<string, DayPlan>): void {
    const { state: newProgress, newBadges } = checkUnlocks(
      state.progress,
      plans,
      ACTIVITIES,
      todayISO(),
      new Date().toISOString(),
    );
    const env: StorageEnvelope = {
      ...toEnvelope(state),
      savedAt: new Date().toISOString(),
      plans,
      progress: newProgress,
    };
    saveNow(localStorage, env);
    set((s) => ({
      plans: env.plans,
      progress: env.progress,
      savedAt: env.savedAt,
      lastNewBadges: newBadges.length > 0 ? newBadges : s.lastNewBadges,
    }));
  }

  return {
    ...initialEnv,
    storageStatus: initialStatus,
    corruptedRaw: initialCorruptedRaw,
    lastNewBadges: [],

    clearNewBadges() {
      set({ lastNewBadges: [] });
    },

    completeWizard(profile, routine) {
      const state = get();
      const env: StorageEnvelope = {
        ...toEnvelope(state),
        savedAt: new Date().toISOString(),
        profile,
        settings: { ...state.settings, routine },
      };
      saveNow(localStorage, env);
      set({ ...env, storageStatus: 'ready', corruptedRaw: null });
    },

    updateSettings(patch) {
      // Il tipo pubblico è un'unione (Partial<Settings> oppure il solo
      // routine/meals annidati parziali); entrambi i membri sono
      // strutturalmente assegnabili a questa forma più permissiva, quindi
      // l'assegnazione qui sotto tipizza senza cast.
      const p: {
        routine?: Partial<RoutineSettings>;
        meals?: Partial<MealSettings>;
        reducedMotion?: Settings['reducedMotion'];
      } = patch;

      const state = get();
      const env: StorageEnvelope = {
        ...toEnvelope(state),
        savedAt: new Date().toISOString(),
        settings: {
          routine: p.routine ? { ...state.settings.routine, ...p.routine } : state.settings.routine,
          meals: p.meals ? { ...state.settings.meals, ...p.meals } : state.settings.meals,
          reducedMotion: p.reducedMotion ?? state.settings.reducedMotion,
        },
      };
      saveNow(localStorage, env);
      set({ settings: env.settings, savedAt: env.savedAt });
    },

    importEnvelope(env) {
      saveNow(localStorage, env);
      set({ ...env, storageStatus: 'ready', corruptedRaw: null });
    },

    resetAll() {
      const env = emptyEnvelope();
      saveNow(localStorage, env);
      set({ ...env, storageStatus: 'ready', corruptedRaw: null });
    },

    timerDispatch(e) {
      const state = get();
      const prevStatus = state.timer?.status ?? null;
      const nextTimer = next(state.timer, e, Date.now());
      if (nextTimer === state.timer) return; // evento non valido: no-op, nessuna scrittura (E4)
      commitTimerTransition(nextTimer, prevStatus);
    },

    /**
     * Ricostruzione al mount di `/timer` (E1, §8.1): usa la stessa `restore()`
     * pura di Task 15, cosi' una sessione `running` il cui tempo e' scaduto
     * nel frattempo (telefono bloccato/riavviato) salta direttamente a
     * `celebrating` — e conta comunque come pasto completato.
     */
    restoreTimer(now) {
      const state = get();
      const prevStatus = state.timer?.status ?? null;
      const restored = restore(state.timer, now);
      if (restored === state.timer) return; // nessuna ricostruzione necessaria
      commitTimerTransition(restored, prevStatus);
    },

    /**
     * Materializza (Task 12: `materializeUpTo`) tutti i giorni mancanti da
     * `profile.vacationStart` fino a `dateISO` incluso e li unisce ai piani
     * esistenti. No-op se il profilo non è ancora impostato o se non ci sono
     * giorni nuovi da aggiungere (evita scritture inutili).
     */
    ensurePlansUpTo(dateISO) {
      const state = get();
      const ctx = genCtx(state);
      if (!ctx) return;
      const newPlans = materializeUpTo(dateISO, ctx);
      if (Object.keys(newPlans).length === 0) return;
      commitPlans(state, { ...state.plans, ...newPlans });
    },

    /**
     * Aggiorna lo stato di un solo slot. Nessun side-effect audio (di
     * competenza della UI). Dopo la scrittura ricalcola `progress`
     * (streak/doneByCategory/badge, Task 18) dai piani aggiornati. Idempotente
     * (E4): se lo slot è già nello stato richiesto non scrive nulla, così una
     * doppia chiamata consecutiva lascia lo stato — e la sua identità di
     * riferimento — invariato dopo la 2ª chiamata quanto dopo la 1ª.
     */
    markSlot(dateISO, slotId, status) {
      const state = get();
      const plan = state.plans[dateISO];
      if (!plan) return;
      const cur = plan.slots.find((s) => s.slotId === slotId);
      if (!cur || cur.status === status) return;
      const newPlan: DayPlan = {
        ...plan,
        slots: plan.slots.map((s) => (s.slotId === slotId ? { ...s, status } : s)),
      };
      commitPlansAndProgress(state, { ...state.plans, [dateISO]: newPlan });
    },

    swapSlot(dateISO, slotId) {
      const state = get();
      const plan = state.plans[dateISO];
      const ctx = genCtx(state);
      if (!plan || !ctx) return { exhausted: false };
      const { plan: newPlan, exhausted } = swapActivity(plan, slotId, ctx);
      if (newPlan === plan) return { exhausted }; // slot inesistente o già esaurito: nessuna scrittura
      commitPlans(state, { ...state.plans, [dateISO]: newPlan });
      return { exhausted };
    },

    /**
     * Scelta manuale del genitore (ActivityPicker): sostituisce l'attività
     * dello slot con `activityId` SENZA alcun filtro di compatibilità
     * (energia/meteo/luogo/durata) — a differenza di `swapSlot`, è una
     * decisione deliberata, non un pick algoritmico. `swapCount` torna a 0:
     * è una scelta nuova, non uno swap automatico, quindi non consuma il
     * budget di "Cambiala". Uno slot `skipped` torna `planned`: scegliere
     * a mano un'attività per uno slot saltato ha il significato pratico di
     * rimetterlo in gioco per la giornata. No-op sicuro se profilo/piano/
     * slot non esistono o lo slot è già `done` (a quel punto l'unica via
     * è il dettaglio, coerente con `SlotCard`).
     */
    setSlotActivity(dateISO, slotId, activityId) {
      const state = get();
      const plan = state.plans[dateISO];
      if (!plan) return;
      const cur = plan.slots.find((s) => s.slotId === slotId);
      if (!cur || cur.status === 'done') return;
      // Guardia difensiva: `activityId` deve esistere nel catalogo. Oggi
      // l'unico chiamante (ActivityPicker) offre solo id reali, ma un id
      // inventato scriverebbe uno slot che `ACTIVITIES.find(...)` non
      // troverebbe mai più, facendo sparire silenziosamente la card dalla
      // timeline (TodayPage fa `return null` per quello slot) — no-op sicuro.
      if (!ACTIVITIES.some((a) => a.id === activityId)) return;
      const newStatus: SlotStatus = cur.status === 'skipped' ? 'planned' : cur.status;
      const newPlan: DayPlan = {
        ...plan,
        slots: plan.slots.map((s) =>
          s.slotId === slotId ? { ...s, activityId, swapCount: 0, status: newStatus } : s,
        ),
      };
      commitPlans(state, { ...state.plans, [dateISO]: newPlan });
    },

    regenerate(dateISO) {
      const state = get();
      const plan = state.plans[dateISO];
      const ctx = genCtx(state);
      if (!plan || !ctx) return;
      const newPlan = regenerateDay(plan, ctx);
      commitPlans(state, { ...state.plans, [dateISO]: newPlan });
    },

    /**
     * FR-8: al salvataggio di una nuova routine (Impostazioni), i giorni da
     * oggi in poi che hanno ancora slot non-`done` vanno rigenerati con le
     * nuove ancore — i `done` di oggi restano intatti (`regenerateDay`, Task
     * 12, li preserva già di suo). Da chiamare DOPO `updateSettings({routine})`,
     * cosi' `genCtx` legge già la routine nuova. Salta i giorni passati, i
     * giorni speciali (nessuno slot da rigenerare) e i giorni già interamente
     * `done` (nulla da cambiare, evita un incremento di `regenNonce` a vuoto).
     */
    regenerateFutureFromToday() {
      const state = get();
      const ctx = genCtx(state);
      if (!ctx) return;
      const today = todayISO();
      const updated: Record<string, DayPlan> = {};
      for (const [dateISO, plan] of Object.entries(state.plans)) {
        if (dateISO < today) continue;
        if (plan.special) continue;
        const fullyDone = plan.slots.length > 0 && plan.slots.every((s) => s.status === 'done');
        if (fullyDone) continue;
        updated[dateISO] = regenerateDay(plan, ctx);
      }
      if (Object.keys(updated).length === 0) return;
      commitPlansAndProgress(state, { ...state.plans, ...updated });
    },

    /** Delega ad `applyWeather` (Task 12), che già non tocca mai gli slot `done`. */
    setWeather(dateISO, w) {
      const state = get();
      const plan = state.plans[dateISO];
      const ctx = genCtx(state);
      if (!plan || !ctx) return;
      const newPlan = applyWeather(plan, w, ctx);
      commitPlans(state, { ...state.plans, [dateISO]: newPlan });
    },

    /**
     * `special` impostato → il giorno diventa "speciale" (slots: []).
     * `special: undefined` → torna un giorno normale: rigenera gli slot con
     * `generateDayPlan` mantenendo lo stesso `regenNonce`. Il piano corrente
     * per `dateISO` viene escluso dal `plans` passato al generatore, perché
     * `buildDay` altrimenti rileggerebbe da lì lo `special` appena rimosso
     * (fallback interno per rigenerazioni "in place").
     */
    setSpecial(dateISO, special) {
      const state = get();
      const ctx = genCtx(state);
      if (!ctx) return;
      const plan = state.plans[dateISO];

      let newPlan: DayPlan;
      if (special) {
        newPlan = {
          date: dateISO,
          familyDay: plan?.familyDay ?? isFamilyDay(dateISO),
          special,
          weather: plan?.weather ?? 'sole',
          regenNonce: plan?.regenNonce ?? 0,
          slots: [],
        };
      } else {
        if (!plan) return;
        const plansWithoutToday = { ...state.plans };
        delete plansWithoutToday[dateISO];
        newPlan = generateDayPlan(dateISO, plan.weather, plan.regenNonce, {
          ...ctx,
          plans: plansWithoutToday,
        });
      }
      commitPlans(state, { ...state.plans, [dateISO]: newPlan });
    },
  };
});

let persistenceInitialized = false;

/**
 * Da chiamare una sola volta all'avvio dell'app (non dentro il creator dello
 * store): collega il debounce delle scritture correnti alle modifiche dello
 * store e re-idrata lo stato quando un'altra scheda/finestra modifica
 * `localStorage` (evento `storage`).
 */
export function initPersistence(): void {
  if (persistenceInitialized) {
    return;
  }
  persistenceInitialized = true;

  const debouncedSave = makeDebouncedSave(() => {
    saveNow(localStorage, toEnvelope(useApp.getState()));
  });

  useApp.subscribe(() => {
    debouncedSave.schedule();
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) {
      return;
    }
    const hydration = loadEnvelope(localStorage);
    if (hydration.ok) {
      useApp.setState({ ...hydration.env, storageStatus: 'ready', corruptedRaw: null });
    } else {
      useApp.setState({ storageStatus: 'corrupted', corruptedRaw: hydration.raw });
    }
  });
}
