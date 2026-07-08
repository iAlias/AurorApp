import type { Activity, BadgeId, CategoryId, DayPlan, PlannedSlot, ProgressState } from '../../../src/core/catalog/types';
import { ACTIVITIES } from '../../../src/core/catalog/activities';
import { BADGES, checkUnlocks, doneByCategory } from '../../../src/core/progress/badges';

// ——— Helpers ———

function slot(activityId: string, status: PlannedSlot['status'] = 'done'): PlannedSlot {
  return { slotId: 'M1', activityId, status, swapCount: 0 };
}

function plan(date: string, slots: PlannedSlot[], extra: Partial<DayPlan> = {}): DayPlan {
  return { date, familyDay: false, weather: 'sole', regenNonce: 0, slots, ...extra };
}

/** `n` piani distinti con un solo slot `done` per la categoria/attività data. */
function plansWithDoneCount(prefix: string, activityId: string, n: number): Record<string, DayPlan> {
  const out: Record<string, DayPlan> = {};
  for (let i = 0; i < n; i++) {
    const date = `2026-0${(i % 9) + 1}-01-${prefix}${i}`; // chiave arbitraria, non serve essere ISO valido qui
    out[date] = plan(date, [slot(activityId)]);
  }
  return out;
}

function emptyProgress(overrides: Partial<ProgressState> = {}): ProgressState {
  return {
    streak: 0,
    lastStreakDate: null,
    badges: {},
    doneByCategory: { MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0 },
    mealTimersCompleted: 0,
    ...overrides,
  };
}

const TODAY = '2026-06-24';
const NOW = '2026-06-24T10:00:00.000Z';

// ——— BADGES: 13 definizioni, nomi esatti FR-9 ———

test('BADGES: contiene esattamente i 13 id/nomi previsti da FR-9', () => {
  const expected: [BadgeId, string][] = [
    ['prima-stella', 'Prima Stella'],
    ['tre-di-fila', 'Tre di Fila'],
    ['settimana-arcobaleno', 'Settimana Arcobaleno'],
    ['mese-magico', 'Mese Magico'],
    ['piccola-artista', 'Piccola Artista'],
    ['esploratrice', 'Esploratrice'],
    ['sirenetta', 'Sirenetta'],
    ['ballerina', 'Ballerina'],
    ['chef-stellata', 'Chef Stellata'],
    ['scienziata', 'Scienziata'],
    ['campionessa', 'Campionessa'],
    ['attrice', 'Attrice'],
    ['buona-forchetta', 'Buona Forchetta'],
  ];
  expect(BADGES).toHaveLength(13);
  for (const [id, name] of expected) {
    const def = BADGES.find((b) => b.id === id);
    expect(def).toBeDefined();
    expect(def?.name).toBe(name);
    expect(def?.emoji.length).toBeGreaterThan(0);
    expect(def?.description.length).toBeGreaterThan(0);
  }
});

// ——— doneByCategory ———

test('doneByCategory: conta solo gli slot done, per categoria dedotta dal prefisso id', () => {
  const plans: Record<string, DayPlan> = {
    '2026-06-20': plan('2026-06-20', [slot('CRE-01', 'done'), slot('MOT-01', 'planned')]),
    '2026-06-21': plan('2026-06-21', [slot('CRE-02', 'done'), slot('NAT-01', 'skipped')]),
  };
  const counts = doneByCategory(plans, []);
  expect(counts.CRE).toBe(2);
  expect(counts.MOT).toBe(0);
  expect(counts.NAT).toBe(0);
});

test('doneByCategory: usa il catalogo come fonte primaria quando disponibile', () => {
  const catalog: Activity[] = [
    {
      id: 'X-01', category: 'ACQ', title: 't', emoji: '💦', durationMin: 20, energy: 'media', place: 'casa',
      requiresDry: false, heatFriendly: true, mess: 0, materials: [], steps: [], develops: [], variation: '',
      interests: [], family: false,
    },
  ];
  const plans: Record<string, DayPlan> = { '2026-06-20': plan('2026-06-20', [slot('X-01', 'done')]) };
  // 'X-01' non ha un prefisso CategoryId valido: senza il catalogo il fallback
  // per-prefisso fallirebbe/darebbe categoria sbagliata.
  expect(doneByCategory(plans, catalog).ACQ).toBe(1);
});

// ——— checkUnlocks: soglie ———

test('checkUnlocks: prima-stella al primo giorno completo', () => {
  const plans: Record<string, DayPlan> = { [TODAY]: plan(TODAY, [slot('MOT-01'), slot('CRE-01')]) };
  const { state, newBadges } = checkUnlocks(emptyProgress(), plans, ACTIVITIES, TODAY, NOW);
  expect(newBadges).toContain('prima-stella');
  expect(state.badges['prima-stella']).toBe(NOW);
});

test('checkUnlocks: tre-di-fila / settimana-arcobaleno / mese-magico sulle soglie streak', () => {
  function nDaysComplete(n: number, endISO: string): Record<string, DayPlan> {
    const plans: Record<string, DayPlan> = {};
    let cursor = endISO;
    for (let i = 0; i < n; i++) {
      plans[cursor] = plan(cursor, [slot('MOT-01'), slot('CRE-01')]);
      const d = new Date(cursor + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }
    return plans;
  }

  const plans3 = nDaysComplete(3, TODAY);
  const r3 = checkUnlocks(emptyProgress(), plans3, ACTIVITIES, TODAY, NOW);
  expect(r3.newBadges).toContain('tre-di-fila');
  expect(r3.newBadges).not.toContain('settimana-arcobaleno');

  const plans7 = nDaysComplete(7, TODAY);
  const r7 = checkUnlocks(emptyProgress(), plans7, ACTIVITIES, TODAY, NOW);
  expect(r7.newBadges).toEqual(expect.arrayContaining(['tre-di-fila', 'settimana-arcobaleno']));
  expect(r7.newBadges).not.toContain('mese-magico');

  const plans30 = nDaysComplete(30, TODAY);
  const r30 = checkUnlocks(emptyProgress(), plans30, ACTIVITIES, TODAY, NOW);
  expect(r30.newBadges).toEqual(
    expect.arrayContaining(['tre-di-fila', 'settimana-arcobaleno', 'mese-magico']),
  );
});

test('checkUnlocks: le 8 soglie per categoria (usando i prefissi reali del catalogo)', () => {
  const cases: [BadgeId, CategoryId, number][] = [
    ['piccola-artista', 'CRE', 10],
    ['esploratrice', 'NAT', 10],
    ['sirenetta', 'ACQ', 10],
    ['ballerina', 'MUS', 10],
    ['chef-stellata', 'CUC', 8],
    ['scienziata', 'COG', 10],
    ['campionessa', 'MOT', 15],
    ['attrice', 'SIM', 10],
  ];
  for (const [badgeId, cat, min] of cases) {
    const activityId = ACTIVITIES.find((a) => a.category === cat)?.id ?? `${cat}-01`;
    const below = plansWithDoneCount(cat, activityId, min - 1);
    const atThreshold = plansWithDoneCount(cat, activityId, min);

    const rBelow = checkUnlocks(emptyProgress(), below, ACTIVITIES, TODAY, NOW);
    expect(rBelow.newBadges).not.toContain(badgeId);

    const rAt = checkUnlocks(emptyProgress(), atThreshold, ACTIVITIES, TODAY, NOW);
    expect(rAt.newBadges).toContain(badgeId);
  }
});

test('checkUnlocks: buona-forchetta a 10 timer pasto completati (letto da state, non dai piani)', () => {
  const below = checkUnlocks(emptyProgress({ mealTimersCompleted: 9 }), {}, ACTIVITIES, TODAY, NOW);
  expect(below.newBadges).not.toContain('buona-forchetta');

  const at = checkUnlocks(emptyProgress({ mealTimersCompleted: 10 }), {}, ACTIVITIES, TODAY, NOW);
  expect(at.newBadges).toContain('buona-forchetta');
});

test('checkUnlocks: un badge già sbloccato non viene ri-aggiunto a newBadges e il timestamp resta invariato', () => {
  const plans: Record<string, DayPlan> = { [TODAY]: plan(TODAY, [slot('MOT-01'), slot('CRE-01')]) };
  const already = emptyProgress({ badges: { 'prima-stella': '2020-01-01T00:00:00.000Z' } });
  const { state, newBadges } = checkUnlocks(already, plans, ACTIVITIES, TODAY, NOW);
  expect(newBadges).not.toContain('prima-stella');
  expect(state.badges['prima-stella']).toBe('2020-01-01T00:00:00.000Z');
});

test('checkUnlocks: unlockedAt non viene mai cancellato anche se i conteggi scendessero sotto soglia', () => {
  // Scenario innaturale (i contatori sono monotoni crescenti nella pratica),
  // simulato apposta per blindare la garanzia "i badge non si perdono mai":
  // lo stato arriva già con 'piccola-artista' sbloccato, ma i piani passati
  // ora mostrano solo 2 CRE fatte (sotto soglia).
  const stateWithBadge = emptyProgress({ badges: { 'piccola-artista': '2026-01-01T00:00:00.000Z' } });
  const fewPlans = plansWithDoneCount('CRE', 'CRE-01', 2);
  const { state, newBadges } = checkUnlocks(stateWithBadge, fewPlans, ACTIVITIES, TODAY, NOW);
  expect(state.badges['piccola-artista']).toBe('2026-01-01T00:00:00.000Z');
  expect(newBadges).not.toContain('piccola-artista');
  expect(state.doneByCategory.CRE).toBe(2); // il conteggio riflette comunque la realtà attuale
});

test('checkUnlocks: aggiorna sempre streak/doneByCategory/lastStreakDate come fonte di verità', () => {
  const plans: Record<string, DayPlan> = { [TODAY]: plan(TODAY, [slot('MOT-01'), slot('CRE-01')]) };
  const { state } = checkUnlocks(emptyProgress(), plans, ACTIVITIES, TODAY, NOW);
  expect(state.streak).toBe(1);
  expect(state.lastStreakDate).toBe(TODAY);
  expect(state.doneByCategory.MOT).toBe(1);
  expect(state.doneByCategory.CRE).toBe(1);
});
