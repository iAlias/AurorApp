import { toMin, toHHMM, deriveSlots } from '../../../src/core/planner/slots';
import { DEFAULT_ROUTINE, DEFAULT_MEALS } from '../../../src/core/catalog/types';

describe('toMin', () => {
  test("converte 'HH:mm' in minuti dalla mezzanotte", () => {
    expect(toMin('13:00')).toBe(780);
  });

  test('converte la mezzanotte', () => {
    expect(toMin('00:00')).toBe(0);
  });

  test('converte tutte le ancore di default', () => {
    expect(toMin(DEFAULT_ROUTINE.wakeTime)).toBe(540);
    expect(toMin(DEFAULT_ROUTINE.breakfastEnd)).toBe(585);
    expect(toMin(DEFAULT_ROUTINE.morningSnackStart)).toBe(660);
    expect(toMin(DEFAULT_ROUTINE.morningSnackEnd)).toBe(680);
    expect(toMin(DEFAULT_ROUTINE.lunchStart)).toBe(780);
    expect(toMin(DEFAULT_ROUTINE.afternoonSnackEnd)).toBe(990);
    expect(toMin(DEFAULT_ROUTINE.dinnerStart)).toBe(1170);
    expect(toMin(DEFAULT_ROUTINE.bedTime)).toBe(1260);
  });
});

describe('toHHMM', () => {
  test('converte minuti in HH:mm con zero-padding', () => {
    expect(toHHMM(780)).toBe('13:00');
    expect(toHHMM(585)).toBe('09:45');
    expect(toHHMM(5)).toBe('00:05');
    expect(toHHMM(0)).toBe('00:00');
  });

  test('è la funzione inversa di toMin per le ancore di default', () => {
    expect(toHHMM(toMin(DEFAULT_ROUTINE.dinnerStart))).toBe(DEFAULT_ROUTINE.dinnerStart);
    expect(toHHMM(toMin(DEFAULT_ROUTINE.bedTime))).toBe(DEFAULT_ROUTINE.bedTime);
  });
});

describe('deriveSlots — giorno feriale (FR-2)', () => {
  const slots = deriveSlots(DEFAULT_ROUTINE, DEFAULT_MEALS, false);
  const [m1, m2, p1, p2, sera] = slots;

  test('produce 5 slot nell\'ordine M1, M2, P1, P2, SERA', () => {
    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.slotId)).toEqual(['M1', 'M2', 'P1', 'P2', 'SERA']);
  });

  test('M1: 585–660 (75 min), energie alta/media, nessun vincolo extra', () => {
    expect(m1.startMin).toBe(585);
    expect(m1.endMin).toBe(660);
    expect(m1.durationMin).toBe(75);
    expect(m1.energies).toEqual(['alta', 'media']);
    expect(m1.preferOutdoor).toBeUndefined();
    expect(m1.onlyCategory).toBeUndefined();
  });

  test('M2: 680–760 (80 min), energie media/bassa', () => {
    expect(m2.startMin).toBe(680);
    expect(m2.endMin).toBe(760);
    expect(m2.durationMin).toBe(80);
    expect(m2.energies).toEqual(['media', 'bassa']);
    expect(m2.preferOutdoor).toBeUndefined();
    expect(m2.onlyCategory).toBeUndefined();
  });

  test('P1: 990–1065 (75 min), energie alta/media, preferOutdoor', () => {
    expect(p1.startMin).toBe(990);
    expect(p1.endMin).toBe(1065);
    expect(p1.durationMin).toBe(75);
    expect(p1.energies).toEqual(['alta', 'media']);
    expect(p1.preferOutdoor).toBe(true);
  });

  test('P2: 1065–1140 (75 min), energie media/bassa', () => {
    expect(p2.startMin).toBe(1065);
    expect(p2.endMin).toBe(1140);
    expect(p2.durationMin).toBe(75);
    expect(p2.energies).toEqual(['media', 'bassa']);
    expect(p2.preferOutdoor).toBeUndefined();
  });

  test('SERA: 1230–1260 (30 min), energia bassa, onlyCategory CAL', () => {
    expect(sera.startMin).toBe(1230);
    expect(sera.endMin).toBe(1260);
    expect(sera.durationMin).toBe(30);
    expect(sera.energies).toEqual(['bassa']);
    expect(sera.onlyCategory).toBe('CAL');
  });
});

describe('deriveSlots — weekend / familyDay (FR-2)', () => {
  test('familyDay:true produce solo [M1, P1]', () => {
    const weekend = deriveSlots(DEFAULT_ROUTINE, DEFAULT_MEALS, true);
    expect(weekend).toHaveLength(2);
    expect(weekend.map((s) => s.slotId)).toEqual(['M1', 'P1']);
  });

  test('familyDay:true mantiene le stesse finestre orarie di M1 e P1 del feriale', () => {
    const feriale = deriveSlots(DEFAULT_ROUTINE, DEFAULT_MEALS, false);
    const weekend = deriveSlots(DEFAULT_ROUTINE, DEFAULT_MEALS, true);
    expect(weekend[0]).toEqual(feriale[0]); // M1
    expect(weekend[1]).toEqual(feriale[2]); // P1
  });
});
