import { DEFAULT_SETTINGS } from '../../src/core/catalog/types';
import type { ChildProfile, RoutineSettings, StorageEnvelope } from '../../src/core/catalog/types';
import { STORAGE_KEY, emptyEnvelope } from '../../src/core/storage/envelope';

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Aurora',
    avatarId: 'volpina',
    birthdate: '2023-05-10',
    interests: ['animali', 'disegno'],
    spaces: ['casa', 'giardino'],
    vacationStart: '2026-07-01',
    vacationEnd: '2026-08-31',
    createdAt: '2026-07-04T09:00:00.000Z',
  };
}

function routineFixture(): RoutineSettings {
  return {
    wakeTime: '08:00',
    breakfastEnd: '08:45',
    morningSnackStart: '10:30',
    morningSnackEnd: '10:50',
    lunchStart: '12:30',
    napStart: '13:30',
    napMinutes: 90,
    afternoonSnackEnd: '16:00',
    preDinnerMinutes: 20,
    dinnerStart: '19:00',
    bedTime: '20:30',
  };
}

// Ogni test importa dinamicamente il modulo dopo aver preparato localStorage,
// cosi' l'idratazione sincrona alla creazione dello store vede lo stato voluto
// (il modulo va resettato altrimenti lo store, creato una sola volta al primo
// import, non si re-idraterebbe mai).
async function freshStore() {
  const mod = await import('../../src/app/store');
  return mod;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('idratazione allo startup', () => {
  test('nessun dato salvato → storageStatus ready, envelope vuota', async () => {
    const { useApp } = await freshStore();
    const state = useApp.getState();
    expect(state.storageStatus).toBe('ready');
    expect(state.corruptedRaw).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('storage corrotto prima della creazione → storageStatus corrupted, non lancia', async () => {
    localStorage.setItem(STORAGE_KEY, '{{{');

    // la creazione dello store non deve mai lanciare, anche con dati corrotti
    const mod = await freshStore();

    const state = mod.useApp.getState();
    expect(state.storageStatus).toBe('corrupted');
    expect(state.corruptedRaw).toBe('{{{');
    // l'app deve restare utilizzabile: envelope vuota in RAM
    expect(state.profile).toBeNull();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('completeWizard', () => {
  test('persiste il profilo su localStorage (write-through)', async () => {
    const { useApp } = await freshStore();
    const profile = profileFixture();
    const routine = routineFixture();

    useApp.getState().completeWizard(profile, routine);

    expect(useApp.getState().profile).toEqual(profile);
    expect(useApp.getState().settings.routine).toEqual(routine);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.profile).toEqual(profile);
    expect(saved.settings.routine).toEqual(routine);
  });
});

describe('resetAll', () => {
  test('torna a envelope vuota e la chiave riflette lo stato vuoto', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());

    useApp.getState().resetAll();

    const state = useApp.getState();
    expect(state.profile).toBeNull();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.plans).toEqual({});
    expect(state.timer).toBeNull();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.profile).toBeNull();
    expect(saved.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('updateSettings', () => {
  test('modifica solo il campo indicato, il resto resta intatto', async () => {
    const { useApp } = await freshStore();
    const before = useApp.getState().settings;

    useApp.getState().updateSettings({ meals: { lunchMinutes: 45 } });

    const after = useApp.getState().settings;
    expect(after.meals.lunchMinutes).toBe(45);
    expect(after.meals.dinnerMinutes).toBe(before.meals.dinnerMinutes);
    expect(after.meals.soundsOn).toBe(before.meals.soundsOn);
    expect(after.meals.volume).toBe(before.meals.volume);
    expect(after.routine).toEqual(before.routine);
    expect(after.reducedMotion).toBe(before.reducedMotion);

    // non deve scrivere subito su storage: updateSettings passa dal debounce
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('importEnvelope', () => {
  test('scrive subito su localStorage e aggiorna lo stato', async () => {
    const { useApp } = await freshStore();
    const env: StorageEnvelope = { ...emptyEnvelope(), profile: profileFixture() };

    useApp.getState().importEnvelope(env);

    expect(useApp.getState().profile).toEqual(profileFixture());
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.profile).toEqual(profileFixture());
  });
});

describe('initPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('pianifica un salvataggio debounced dopo un cambiamento di stato', async () => {
    const { useApp, initPersistence } = await freshStore();
    initPersistence();

    useApp.getState().updateSettings({ meals: { lunchMinutes: 45 } });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(300);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.settings.meals.lunchMinutes).toBe(45);
  });

  test("evento 'storage' di un'altra scheda re-idrata lo stato", async () => {
    const { useApp, initPersistence } = await freshStore();
    initPersistence();

    const otherEnv: StorageEnvelope = { ...emptyEnvelope(), profile: profileFixture() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(otherEnv));
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(otherEnv) }),
    );

    expect(useApp.getState().profile).toEqual(profileFixture());
    expect(useApp.getState().storageStatus).toBe('ready');
  });
});
