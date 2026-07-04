import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import type {
  ChildProfile,
  MealSettings,
  RoutineSettings,
  Settings,
  StorageEnvelope,
} from '../core/catalog/types';
import { STORAGE_KEY, emptyEnvelope } from '../core/storage/envelope';
import { loadEnvelope, makeDebouncedSave, saveNow } from '../core/storage/persist';

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
  // azioni piani/timer/progressi aggiunte nei task 10/12/13 — firme definite lì
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
