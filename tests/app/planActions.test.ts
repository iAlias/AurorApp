import { DEFAULT_SETTINGS } from '../../src/core/catalog/types';
import type { ChildProfile, RoutineSettings } from '../../src/core/catalog/types';

function profileFixture(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: 'child-1',
    name: 'Aurora',
    avatarId: 'volpina',
    birthdate: '2023-05-10',
    interests: ['animali', 'disegno'],
    spaces: ['casa', 'giardino'],
    vacationStart: '2026-07-01', // mercoledì
    vacationEnd: '2026-08-31',
    createdAt: '2026-07-04T09:00:00.000Z',
    ...overrides,
  };
}

function routineFixture(): RoutineSettings {
  return DEFAULT_SETTINGS.routine;
}

// Ogni test importa dinamicamente il modulo dopo aver preparato localStorage,
// così l'idratazione sincrona alla creazione dello store parte pulita (lo
// store è un singleton per import, va resettato tra i test).
async function freshStore() {
  const mod = await import('../../src/app/store');
  return mod;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('ensurePlansUpTo', () => {
  test('materializza in ordine da vacationStart fino a dateISO incluso', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());

    useApp.getState().ensurePlansUpTo('2026-07-03');

    const { plans } = useApp.getState();
    expect(Object.keys(plans).sort()).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    for (const iso of ['2026-07-01', '2026-07-02', '2026-07-03']) {
      expect(plans[iso].date).toBe(iso);
      expect(plans[iso].slots.length).toBeGreaterThan(0);
    }

    // write-through: la scrittura è immediata, non serve il debounce.
    const raw = localStorage.getItem('aurorapp.state.v1');
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as { plans: Record<string, unknown> };
    expect(Object.keys(saved.plans).sort()).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });

  test('non fa nulla se il profilo non è ancora impostato', async () => {
    const { useApp } = await freshStore();
    useApp.getState().ensurePlansUpTo('2026-07-03');
    expect(useApp.getState().plans).toEqual({});
  });

  test('non rigenera i giorni già presenti (secondo giro no-op)', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-03');
    const first = useApp.getState().plans;

    useApp.getState().ensurePlansUpTo('2026-07-03');
    const second = useApp.getState().plans;

    expect(second).toEqual(first);
  });
});

describe('markSlot', () => {
  test('doppio markSlot(done) consecutivo produce lo stesso stato della 1ª chiamata (idempotenza E4)', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;

    useApp.getState().markSlot('2026-07-01', slotId, 'done');
    const afterFirst = useApp.getState().plans['2026-07-01'];

    useApp.getState().markSlot('2026-07-01', slotId, 'done');
    const afterSecond = useApp.getState().plans['2026-07-01'];

    expect(afterSecond).toEqual(afterFirst);
    const slot = afterSecond.slots.find((s) => s.slotId === slotId);
    expect(slot?.status).toBe('done');
  });

  test('scrive subito su localStorage (write-through)', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;

    useApp.getState().markSlot('2026-07-01', slotId, 'done');

    const raw = localStorage.getItem('aurorapp.state.v1');
    const saved = JSON.parse(raw as string) as {
      plans: Record<string, { slots: { slotId: string; status: string }[] }>;
    };
    const savedSlot = saved.plans['2026-07-01'].slots.find((s) => s.slotId === slotId);
    expect(savedSlot?.status).toBe('done');
  });

  test('nessun effetto se il giorno o lo slot non esistono', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());

    useApp.getState().markSlot('2026-07-01', 'M1', 'done'); // nessun piano ancora materializzato
    expect(useApp.getState().plans).toEqual({});
  });
});

describe('setWeather', () => {
  test('non tocca mai gli slot già done', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const before = useApp.getState().plans['2026-07-01'];
    const doneSlotId = before.slots[0].slotId;
    const doneActivityId = before.slots[0].activityId;

    useApp.getState().markSlot('2026-07-01', doneSlotId, 'done');
    useApp.getState().setWeather('2026-07-01', 'pioggia');

    const after = useApp.getState().plans['2026-07-01'];
    const doneSlot = after.slots.find((s) => s.slotId === doneSlotId);
    expect(doneSlot?.status).toBe('done');
    expect(doneSlot?.activityId).toBe(doneActivityId);
    expect(after.weather).toBe('pioggia');
  });
});

describe('swapSlot', () => {
  test('incrementa swapCount e cambia l\'attività dello slot', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;

    const result = useApp.getState().swapSlot('2026-07-01', slotId);

    const slot = useApp.getState().plans['2026-07-01'].slots.find((s) => s.slotId === slotId);
    expect(slot?.swapCount).toBe(1);
    expect(result.exhausted).toBe(false);
  });
});

describe('setSlotActivity', () => {
  test('cambia l\'attività dello slot e azzera swapCount', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;
    useApp.getState().swapSlot('2026-07-01', slotId); // swapCount passa a 1

    useApp.getState().setSlotActivity('2026-07-01', slotId, 'CAL-01');

    const slot = useApp.getState().plans['2026-07-01'].slots.find((s) => s.slotId === slotId);
    expect(slot?.activityId).toBe('CAL-01');
    expect(slot?.swapCount).toBe(0);
  });

  test('riporta uno slot skipped a planned (la scelta manuale lo rimette in gioco)', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;
    useApp.getState().markSlot('2026-07-01', slotId, 'skipped');

    useApp.getState().setSlotActivity('2026-07-01', slotId, 'CAL-01');

    const slot = useApp.getState().plans['2026-07-01'].slots.find((s) => s.slotId === slotId);
    expect(slot?.status).toBe('planned');
    expect(slot?.activityId).toBe('CAL-01');
  });

  test('nessun effetto se lo slot è già done', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;
    useApp.getState().markSlot('2026-07-01', slotId, 'done');
    const before = useApp.getState().plans['2026-07-01'];

    useApp.getState().setSlotActivity('2026-07-01', slotId, 'CAL-01');

    expect(useApp.getState().plans['2026-07-01']).toEqual(before);
  });

  test('nessun effetto se il giorno o lo slot non esistono', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());

    useApp.getState().setSlotActivity('2026-07-01', 'M1', 'CAL-01'); // nessun piano ancora materializzato
    expect(useApp.getState().plans).toEqual({});
  });

  test('scrive subito su localStorage (write-through)', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const slotId = useApp.getState().plans['2026-07-01'].slots[0].slotId;

    useApp.getState().setSlotActivity('2026-07-01', slotId, 'CAL-01');

    const raw = localStorage.getItem('aurorapp.state.v1');
    const saved = JSON.parse(raw as string) as {
      plans: Record<string, { slots: { slotId: string; activityId: string; swapCount: number }[] }>;
    };
    const savedSlot = saved.plans['2026-07-01'].slots.find((s) => s.slotId === slotId);
    expect(savedSlot?.activityId).toBe('CAL-01');
    expect(savedSlot?.swapCount).toBe(0);
  });
});

describe('regenerate', () => {
  test('incrementa regenNonce e preserva gli slot già done', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const before = useApp.getState().plans['2026-07-01'];
    const doneSlotId = before.slots[0].slotId;
    const doneActivityId = before.slots[0].activityId;
    useApp.getState().markSlot('2026-07-01', doneSlotId, 'done');

    useApp.getState().regenerate('2026-07-01');

    const after = useApp.getState().plans['2026-07-01'];
    expect(after.regenNonce).toBe(before.regenNonce + 1);
    const doneSlot = after.slots.find((s) => s.slotId === doneSlotId);
    expect(doneSlot?.status).toBe('done');
    expect(doneSlot?.activityId).toBe(doneActivityId);
  });
});

// Task 20 (FR-8): al salvataggio di una nuova routine, i giorni da oggi in
// poi con almeno uno slot non-done vanno rigenerati (i `done` restano).
describe('regenerateFutureFromToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('rigenera solo i giorni futuri con slot non-done; lascia intatti passato, oggi-già-pieno e giorni speciali', async () => {
    vi.setSystemTime(new Date('2026-07-02T10:00:00')); // giovedì: "oggi" feriale, 5 slot
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-04');

    // 07-01 (mercoledì, PASSATO): due slot done, il resto no.
    const past = useApp.getState().plans['2026-07-01'];
    useApp.getState().markSlot('2026-07-01', past.slots[0].slotId, 'done');
    useApp.getState().markSlot('2026-07-01', past.slots[1].slotId, 'done');
    const pastBefore = useApp.getState().plans['2026-07-01'];

    // 07-02 (OGGI): tutti gli slot done (giorno interamente fatto).
    for (const s of useApp.getState().plans['2026-07-02'].slots) {
      useApp.getState().markSlot('2026-07-02', s.slotId, 'done');
    }
    const todayBefore = useApp.getState().plans['2026-07-02'];

    // 07-03 (FUTURO, feriale): un solo slot done, gli altri no.
    const future = useApp.getState().plans['2026-07-03'];
    useApp.getState().markSlot('2026-07-03', future.slots[0].slotId, 'done');
    const futureDoneSlotId = future.slots[0].slotId;
    const futureDoneActivityId = future.slots[0].activityId;

    // 07-04 (FUTURO, giorno speciale): nessuno slot da rigenerare.
    useApp.getState().setSpecial('2026-07-04', { kind: 'mare' });
    const specialBefore = useApp.getState().plans['2026-07-04'];

    useApp.getState().regenerateFutureFromToday();

    // Passato: invariato.
    expect(useApp.getState().plans['2026-07-01']).toEqual(pastBefore);
    // Oggi interamente fatto: invariato (nulla da rigenerare).
    expect(useApp.getState().plans['2026-07-02']).toEqual(todayBefore);
    // Giorno speciale: invariato.
    expect(useApp.getState().plans['2026-07-04']).toEqual(specialBefore);

    // Futuro parzialmente fatto: rigenerato (nonce+1), lo slot done preservato.
    const futureAfter = useApp.getState().plans['2026-07-03'];
    expect(futureAfter.regenNonce).toBe(future.regenNonce + 1);
    const preservedSlot = futureAfter.slots.find((s) => s.slotId === futureDoneSlotId);
    expect(preservedSlot?.status).toBe('done');
    expect(preservedSlot?.activityId).toBe(futureDoneActivityId);
  });

  test('non fa nulla se il profilo non è ancora impostato', async () => {
    const { useApp } = await freshStore();
    useApp.getState().regenerateFutureFromToday();
    expect(useApp.getState().plans).toEqual({});
  });
});

describe('setSpecial', () => {
  test('imposta un giorno speciale con slots vuoti', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');

    useApp.getState().setSpecial('2026-07-01', { kind: 'mare' });

    const plan = useApp.getState().plans['2026-07-01'];
    expect(plan.special).toEqual({ kind: 'mare' });
    expect(plan.slots).toEqual([]);
  });

  test('undefined torna a un giorno normale con slot rigenerati', async () => {
    const { useApp } = await freshStore();
    useApp.getState().completeWizard(profileFixture(), routineFixture());
    useApp.getState().ensurePlansUpTo('2026-07-01');
    const before = useApp.getState().plans['2026-07-01'];

    useApp.getState().setSpecial('2026-07-01', { kind: 'mare' });
    useApp.getState().setSpecial('2026-07-01', undefined);

    const after = useApp.getState().plans['2026-07-01'];
    expect(after.special).toBeUndefined();
    expect(after.slots.length).toBe(before.slots.length);
    expect(after.regenNonce).toBe(before.regenNonce);
  });
});
