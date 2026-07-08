import { addDays, format, parseISO } from 'date-fns';
import type { DayPlan } from '../catalog/types';
import { isFamilyDay } from '../planner/generator';

/** Giorno "pieno": almeno 2 slot segnati `done` (FR-9). Nessun piano = non completo. */
export function isDayComplete(p: DayPlan | undefined): boolean {
  if (!p) return false;
  return p.slots.filter((s) => s.status === 'done').length >= 2;
}

/**
 * Giorno "jolly" per lo streak: weekend o giorno speciale con meno di 2 slot
 * fatti (non conta come completo ma non interrompe nemmeno lo streak).
 * Se `p` non esiste ancora (giorno non ancora materializzato) il weekend si
 * deduce da `dateISO` con la stessa regola di `isFamilyDay` (Task 12), così
 * lo streak resta corretto anche camminando all'indietro oltre l'orizzonte
 * dei piani materializzati.
 */
export function isJolly(p: DayPlan | undefined, dateISO: string): boolean {
  if (isDayComplete(p)) return false;
  const weekend = p ? p.familyDay : isFamilyDay(dateISO);
  const special = p?.special !== undefined;
  return weekend || special;
}

function prevDay(dateISO: string): string {
  return format(addDays(parseISO(dateISO), -1), 'yyyy-MM-dd');
}

/**
 * Cammina indietro da `todayISO`: ogni giorno completo vale +1, ogni giorno
 * "jolly" viene saltato (non incrementa ma non azzera), il primo giorno
 * feriale normale con meno di 2 fatti interrompe la conta. Il giorno corrente
 * entra nello streak solo se è già completo — altrimenti si parte da ieri,
 * così un giorno ancora in corso (magari completato più tardi) non azzera
 * artificialmente lo streak mentre la bimba sta ancora giocando.
 */
export function computeStreak(plans: Record<string, DayPlan>, todayISO: string): number {
  let streak = 0;
  let cursor = todayISO;

  if (isDayComplete(plans[todayISO])) {
    streak = 1;
    cursor = prevDay(todayISO);
  } else {
    cursor = prevDay(todayISO);
  }

  for (;;) {
    const plan = plans[cursor];
    if (isDayComplete(plan)) {
      streak += 1;
      cursor = prevDay(cursor);
    } else if (isJolly(plan, cursor)) {
      cursor = prevDay(cursor);
    } else {
      break;
    }
  }

  return streak;
}
