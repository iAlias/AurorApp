import { ACTIVITIES } from '../../src/core/catalog/activities';
import { DEFAULT_SETTINGS } from '../../src/core/catalog/types';
import type { ChildProfile, RoutineSettings } from '../../src/core/catalog/types';

// Task 18 (review): questi test verificano il "collante" a livello STORE che
// aggancia markSlot/timerDispatch al ricalcolo di `progress` tramite
// `checkUnlocks` (src/app/store.ts, `commitPlansAndProgress`/
// `commitTimerTransition`). La logica pura di streak/badge è già coperta a
// fondo in tests/core/progress/*; qui interessa solo che lo store la invochi
// davvero e ne propaghi il risultato (`progress`, `lastNewBadges`).

const MIN = 60_000;
const TODAY = '2026-07-08'; // mercoledì: giorno feriale, 5 slot per piano

function profileFixture(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: 'child-1',
    name: 'Sofia',
    avatarId: 'volpina', gender: 'f',
    birthdate: '2023-05-10',
    interests: ['animali', 'disegno'],
    spaces: ['casa', 'giardino'],
    createdAt: '2026-07-04T09:00:00.000Z',
    ...overrides,
  };
}

function routineFixture(): RoutineSettings {
  return DEFAULT_SETTINGS.routine;
}

// Stesso pattern di tests/app/planActions.test.ts e
// tests/features/mealTimer/timerStore.test.ts: lo store è un singleton per
// import, va re-importato "fresco" a ogni test dopo aver pulito localStorage.
async function freshStore() {
  return import('../../src/app/store');
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('markSlot → checkUnlocks (streak/badge)', () => {
  test('due slot done nello stesso giorno sbloccano prima-stella e portano streak a 1', async () => {
    vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlans(TODAY, TODAY);
    const slots = useApp.getState().plans[TODAY].slots;
    expect(slots.length).toBeGreaterThanOrEqual(2);

    useApp.getState().markSlot(TODAY, slots[0].slotId, 'done');
    useApp.getState().markSlot(TODAY, slots[1].slotId, 'done');

    const state = useApp.getState();
    expect(state.progress.streak).toBe(1);
    expect(state.lastNewBadges).toContain('prima-stella');
    expect(state.progress.badges['prima-stella']).toBeDefined();
  });

  test('clearNewBadges svuota il canale effimero ma il badge resta impostato in progress per sempre', async () => {
    vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlans(TODAY, TODAY);
    const slots = useApp.getState().plans[TODAY].slots;
    useApp.getState().markSlot(TODAY, slots[0].slotId, 'done');
    useApp.getState().markSlot(TODAY, slots[1].slotId, 'done');
    expect(useApp.getState().lastNewBadges).toContain('prima-stella');

    useApp.getState().clearNewBadges();
    expect(useApp.getState().lastNewBadges).toEqual([]);
    const unlockedAt = useApp.getState().progress.badges['prima-stella'];
    expect(unlockedAt).toBeDefined();

    // Un'ulteriore azione che non produce nuovi sblocchi non deve né
    // riaggiungere 'prima-stella' a lastNewBadges né alterarne l'unlockedAt
    // già scritto in progress (i badge non si perdono/ri-notificano mai).
    useApp.getState().markSlot(TODAY, slots[2].slotId, 'done');
    expect(useApp.getState().progress.badges['prima-stella']).toBe(unlockedAt);
    expect(useApp.getState().lastNewBadges).not.toContain('prima-stella');
  });

  test('doneByCategory riflette la categoria reale (dal catalogo) dell\'attività segnata done', async () => {
    vi.setSystemTime(new Date(`${TODAY}T10:00:00`));
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlans(TODAY, TODAY);
    const targetSlot = useApp.getState().plans[TODAY].slots[0];
    const activity = ACTIVITIES.find((a) => a.id === targetSlot.activityId);
    expect(activity).toBeDefined();
    const cat = activity!.category;
    expect(useApp.getState().progress.doneByCategory[cat]).toBe(0);

    useApp.getState().markSlot(TODAY, targetSlot.slotId, 'done');

    expect(useApp.getState().progress.doneByCategory[cat]).toBe(1);
  });
});

describe('timerDispatch → checkUnlocks (mealTimersCompleted)', () => {
  test('un pasto completato (celebrating) aggiorna mealTimersCompleted e ricalcola progress in modo coerente', async () => {
    const { useApp } = await freshStore();
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(0);
    useApp
      .getState()
      .timerDispatch({ type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' });
    expect(useApp.getState().progress.mealTimersCompleted).toBe(0);

    nowSpy.mockReturnValue(61 * MIN);
    useApp.getState().timerDispatch({ type: 'TICK' });

    const state = useApp.getState();
    expect(state.timer?.status).toBe('celebrating');
    expect(state.progress.mealTimersCompleted).toBe(1);
    // checkUnlocks e' stato invocato con i piani correnti (vuoti in questo
    // scenario): streak/doneByCategory riflettono la fonte di verità e non
    // restano semplicemente "quello che c'era prima".
    expect(state.progress.streak).toBe(0);
    expect(state.progress.doneByCategory).toEqual({
      MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
    });
  });
});
