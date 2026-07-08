import { DEFAULT_SETTINGS } from '../../src/core/catalog/types';
import type { ChildProfile, RoutineSettings, StorageEnvelope } from '../../src/core/catalog/types';
import { STORAGE_KEY, emptyEnvelope } from '../../src/core/storage/envelope';
import { exportJson, parseBackup } from '../../src/core/storage/exportImport';

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
  });

  test('scrive subito su localStorage (write-through), senza attendere il debounce', async () => {
    const { useApp } = await freshStore();

    useApp.getState().updateSettings({ meals: { lunchMinutes: 45 } });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.settings.meals.lunchMinutes).toBe(45);
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

describe('round-trip export → azzera → importa (AC-9 §14)', () => {
  test('con 30 giorni di storia (piani, done, timer in pausa), lo stato dopo export→reset→import è bit-a-bit identico all\'originale', async () => {
    const { useApp, toEnvelope } = await freshStore();

    // Stato "vissuto": profilo, 30 giorni di piani materializzati, alcune
    // attività segnate fatte (progress/streak/badge ricalcolati di
    // conseguenza) e un timer pasto in pausa — non solo l'envelope vuota di
    // un wizard appena completato, per esercitare davvero il round-trip
    // dell'intera forma dei dati (AC-9 richiede esplicitamente "30 giorni
    // di storia").
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-30'); // vacationStart 2026-07-01 → 30 giorni
    useApp.getState().markSlot('2026-07-01', 'M1', 'done');
    useApp.getState().markSlot('2026-07-01', 'M2', 'done');
    useApp.getState().markSlot('2026-07-02', 'M1', 'done');
    useApp.getState().timerDispatch({
      type: 'START',
      meal: 'pranzo',
      durationMs: 60 * 60_000,
      dateISO: '2026-07-30',
    });
    useApp.getState().timerDispatch({ type: 'PAUSE' });

    const original = toEnvelope(useApp.getState());
    // Il "profilo di history" richiesto da AC-9: davvero 30 giorni materializzati.
    expect(Object.keys(original.plans)).toHaveLength(30);

    const json = exportJson(original);

    useApp.getState().resetAll();
    expect(useApp.getState().profile).toBeNull(); // azzeramento riuscito, non un no-op

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    useApp.getState().importEnvelope(parsed.env);

    const restored = toEnvelope(useApp.getState());

    // Confronto bit-a-bit: sia deep-equal strutturale sia identità testuale
    // della serializzazione JSON (cattura anche differenze di forma che
    // `toEqual` da solo potrebbe non distinguere, es. chiavi extra/mancanti).
    expect(restored).toEqual(original);
    expect(exportJson(restored)).toBe(json);

    // E anche il round-trip via localStorage (non solo lo stato in RAM):
    // quel che `importEnvelope` ha effettivamente scritto è la stessa
    // envelope, byte per byte una volta ri-serializzata.
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(original);
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

    // `clearNewBadges` è l'unica azione dello store che muta lo stato senza
    // essere write-through (nessun dominio di persistenza esplicito ha
    // bisogno di leggere subito `lastNewBadges` da localStorage): usata qui
    // per esercitare il solo meccanismo di debounce generico di
    // `initPersistence`, indipendente da qualunque azione write-through.
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    localStorage.clear();

    useApp.getState().clearNewBadges();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(300);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.profile).toEqual(profileFixture());
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
