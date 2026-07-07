import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type {
  ChildProfile,
  MealSettings,
  RoutineSettings,
  Settings,
  StorageEnvelope,
  TimerSession,
} from '../core/catalog/types';
import { STORAGE_KEY, emptyEnvelope } from '../core/storage/envelope';
import { loadEnvelope, makeDebouncedSave, saveNow } from '../core/storage/persist';
import { next } from '../core/timer/timerMachine';
import type { TimerEvent } from '../core/timer/timerMachine';
import { restore } from '../core/timer/progress';

// ——— Stato di idratazione ———
export type StorageStatus = 'ready' | 'corrupted';

export interface AppStore extends StorageEnvelope {
  storageStatus: StorageStatus;
  corruptedRaw: string | null;
  completeWizard(profile: ChildProfile, routine: RoutineSettings): void;
  updateSettings(
    patch: Partial<Settings> | { routine?: Partial<RoutineSettings>; meals?: Partial<MealSettings> },
  ): void;
  importEnvelope(env: StorageEnvelope): void;
  resetAll(): void;
  timerDispatch(e: TimerEvent): void;
  restoreTimer(now: number): void;
  // azioni piani/progressi aggiunte nei task 10/12/13 — firme definite lì
}

/** Estrae i soli campi persistibili (StorageEnvelope) da uno stato che li contiene. */
function toEnvelope(state: StorageEnvelope): StorageEnvelope {
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
   * non arrivano mai).
   */
  function commitTimerTransition(nextTimer: TimerSession | null, prevStatus: TimerSession['status'] | null): void {
    const state = get();
    const becameCelebrating =
      nextTimer !== null && nextTimer.status === 'celebrating' && prevStatus !== 'celebrating';

    const env: StorageEnvelope = {
      ...toEnvelope(state),
      savedAt: new Date().toISOString(),
      timer: nextTimer,
      progress: becameCelebrating
        ? { ...state.progress, mealTimersCompleted: state.progress.mealTimersCompleted + 1 }
        : state.progress,
    };
    saveNow(localStorage, env);
    set({ timer: env.timer, progress: env.progress, savedAt: env.savedAt });
  }

  return {
    ...initialEnv,
    storageStatus: initialStatus,
    corruptedRaw: initialCorruptedRaw,

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

      set((state) => ({
        settings: {
          routine: p.routine ? { ...state.settings.routine, ...p.routine } : state.settings.routine,
          meals: p.meals ? { ...state.settings.meals, ...p.meals } : state.settings.meals,
          reducedMotion: p.reducedMotion ?? state.settings.reducedMotion,
        },
        savedAt: new Date().toISOString(),
      }));
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
