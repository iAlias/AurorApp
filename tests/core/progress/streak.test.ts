import type { DayPlan, PlannedSlot } from '../../../src/core/catalog/types';
import { computeStreak, isDayComplete, isJolly } from '../../../src/core/progress/streak';

// ——— Helpers ———
// 2026-06-19 venerdì · 2026-06-20 sabato · 2026-06-21 domenica · 2026-06-22
// lunedì · 2026-06-23 martedì · 2026-06-24 mercoledì (settimana di riferimento
// per tutti i test sotto, verificata con getDay).

function slot(activityId: string, status: PlannedSlot['status']): PlannedSlot {
  return { slotId: 'M1', activityId, status, swapCount: 0 };
}

function completePlan(date: string, familyDay = false): DayPlan {
  return {
    date,
    familyDay,
    weather: 'sole',
    regenNonce: 0,
    slots: [slot('MOT-01', 'done'), slot('CRE-01', 'done')],
  };
}

function emptyPlan(date: string, familyDay = false): DayPlan {
  return { date, familyDay, weather: 'sole', regenNonce: 0, slots: [slot('MOT-01', 'planned')] };
}

function specialPlan(date: string, familyDay = false): DayPlan {
  return {
    date,
    familyDay,
    special: { kind: 'mare' },
    weather: 'sole',
    regenNonce: 0,
    slots: [],
  };
}

// ——— isDayComplete ———

test('isDayComplete: undefined → false', () => {
  expect(isDayComplete(undefined)).toBe(false);
});

test('isDayComplete: 2+ slot done → true', () => {
  expect(isDayComplete(completePlan('2026-06-22'))).toBe(true);
});

test('isDayComplete: 1 solo slot done → false', () => {
  const p: DayPlan = { ...emptyPlan('2026-06-22'), slots: [slot('MOT-01', 'done')] };
  expect(isDayComplete(p)).toBe(false);
});

// ——— isJolly ———

test('isJolly: weekend con <2 done → true', () => {
  expect(isJolly(emptyPlan('2026-06-20', true), '2026-06-20')).toBe(true);
});

test('isJolly: weekend senza piano ancora materializzato → true (dedotto da dateISO)', () => {
  expect(isJolly(undefined, '2026-06-20')).toBe(true); // sabato
});

test('isJolly: giorno speciale con <2 done → true anche se feriale', () => {
  expect(isJolly(specialPlan('2026-06-23'), '2026-06-23')).toBe(true); // martedì
});

test('isJolly: giorno feriale normale con <2 done → false', () => {
  expect(isJolly(emptyPlan('2026-06-23'), '2026-06-23')).toBe(false);
});

test('isJolly: giorno già completo → false (non è jolly, è complete)', () => {
  expect(isJolly(completePlan('2026-06-23'), '2026-06-23')).toBe(false);
});

// ——— computeStreak ———

test('computeStreak: weekend jolly in mezzo — ven complete, sab/dom 0 done, lun complete → 2', () => {
  const plans: Record<string, DayPlan> = {
    '2026-06-19': completePlan('2026-06-19'),
    '2026-06-20': emptyPlan('2026-06-20', true),
    '2026-06-21': emptyPlan('2026-06-21', true),
    '2026-06-22': completePlan('2026-06-22'),
  };
  expect(computeStreak(plans, '2026-06-22')).toBe(2);
});

test('computeStreak: giorno speciale jolly in mezzo non interrompe lo streak', () => {
  const plans: Record<string, DayPlan> = {
    '2026-06-22': completePlan('2026-06-22'), // lunedì
    '2026-06-23': specialPlan('2026-06-23'), // martedì, giornata speciale
    '2026-06-24': completePlan('2026-06-24'), // mercoledì, oggi
  };
  expect(computeStreak(plans, '2026-06-24')).toBe(2);
});

test('computeStreak: interruzione feriale azzera la conta a ritroso', () => {
  const plans: Record<string, DayPlan> = {
    '2026-06-22': completePlan('2026-06-22'), // lunedì, completo ma irraggiungibile
    '2026-06-23': emptyPlan('2026-06-23'), // martedì feriale, <2 done → stop
    '2026-06-24': completePlan('2026-06-24'), // mercoledì, oggi
  };
  expect(computeStreak(plans, '2026-06-24')).toBe(1);
});

test('computeStreak: oggi non ancora completo → si calcola da ieri, non azzera', () => {
  const plans: Record<string, DayPlan> = {
    '2026-06-22': completePlan('2026-06-22'), // lunedì
    '2026-06-23': completePlan('2026-06-23'), // martedì
    '2026-06-24': emptyPlan('2026-06-24'), // mercoledì, oggi, ancora 0 done
  };
  expect(computeStreak(plans, '2026-06-24')).toBe(2);
});

test('computeStreak: nessun piano → 0', () => {
  expect(computeStreak({}, '2026-06-24')).toBe(0);
});

test('computeStreak: cammina indietro oltre l\'orizzonte materializzato deducendo il weekend da dateISO', () => {
  // Solo oggi (lunedì) materializzato: sab/dom prima non hanno piano ma sono
  // dedotti come weekend (jolly) da isFamilyDay(dateISO), quindi non stoppano
  // — semplicemente non c'è nulla di completo prima, quindi lo streak resta 1.
  const plans: Record<string, DayPlan> = { '2026-06-22': completePlan('2026-06-22') };
  expect(computeStreak(plans, '2026-06-22')).toBe(1);
});
