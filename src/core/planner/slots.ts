import type { Energy, MealSettings, RoutineSettings, SlotId } from '../catalog/types';

export interface SlotDef {
  slotId: SlotId;
  startMin: number;
  endMin: number;
  durationMin: number;
  energies: Energy[];
  onlyCategory?: 'CAL';
  preferOutdoor?: boolean;
}

/** Converte 'HH:mm' in minuti dalla mezzanotte, es. '13:00' → 780. */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Converte minuti dalla mezzanotte in 'HH:mm' con zero-padding, es. 780 → '13:00'. */
export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function makeSlot(
  slotId: SlotId,
  startMin: number,
  endMin: number,
  energies: Energy[],
  extra?: Partial<Pick<SlotDef, 'onlyCategory' | 'preferOutdoor'>>,
): SlotDef {
  return { slotId, startMin, endMin, durationMin: endMin - startMin, energies, ...extra };
}

/**
 * Deriva gli slot attività della giornata dalle ancore della routine (FR-2).
 * Feriale: M1, M2, P1, P2, SERA — solo P1, P2, SERA se la mattina è al
 * nido/asilo (`routine.school`). Weekend (familyDay:true): solo M1, P1.
 */
export function deriveSlots(
  r: RoutineSettings,
  meals: MealSettings,
  familyDay: boolean,
): SlotDef[] {
  const breakfastEnd = toMin(r.breakfastEnd);
  const morningSnackStart = toMin(r.morningSnackStart);
  const morningSnackEnd = toMin(r.morningSnackEnd);
  const lunchStart = toMin(r.lunchStart);
  const afternoonSnackEnd = toMin(r.afternoonSnackEnd);
  const dinnerStart = toMin(r.dinnerStart);
  const bedTime = toMin(r.bedTime);

  const m1 = makeSlot('M1', breakfastEnd, morningSnackStart, ['alta', 'media']);
  const m2 = makeSlot('M2', morningSnackEnd, lunchStart - 20, ['media', 'bassa']);

  const snackEnd = afternoonSnackEnd;
  const preDinner = dinnerStart - r.preDinnerMinutes;
  const mid = snackEnd + Math.floor((preDinner - snackEnd) / 2);

  const p1 = makeSlot('P1', snackEnd, mid, ['alta', 'media'], { preferOutdoor: true });
  const p2 = makeSlot('P2', mid, preDinner, ['media', 'bassa']);
  const sera = makeSlot('SERA', dinnerStart + meals.dinnerMinutes, bedTime, ['bassa'], {
    onlyCategory: 'CAL',
  });

  if (familyDay) return [m1, p1];
  if (r.school) return [p1, p2, sera];
  return [m1, m2, p1, p2, sera];
}
