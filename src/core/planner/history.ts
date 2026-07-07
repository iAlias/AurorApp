import { addDays, format, parseISO } from 'date-fns';
import type { CategoryId, DayPlan } from '../catalog/types';

/**
 * Deriva la categoria dall'id attività ('MOT-01' → 'MOT').
 * Gli id del catalogo sono stabili e sempre nella forma `CAT-NN`, quindi il
 * prefisso è la CategoryId: evitiamo di dover passare l'intero catalogo.
 */
export function categoryOf(activityId: string): CategoryId {
  return activityId.slice(0, activityId.indexOf('-')) as CategoryId;
}

/** Estremo inferiore (incluso) della finestra `[before - windowDays, before)`. */
function windowLowerBound(beforeISO: string, windowDays: number): string {
  return format(addDays(parseISO(beforeISO), -windowDays), 'yyyy-MM-dd');
}

/**
 * Insieme degli id attività assegnati nei `windowDays` giorni *strettamente prima*
 * di `beforeISO`. Il confronto è fatto sulle stringhe ISO (yyyy-MM-dd), che sono
 * ordinabili lessicograficamente = cronologicamente: nessun parse per-elemento.
 */
export function recentActivityIds(
  plans: Record<string, DayPlan>,
  beforeISO: string,
  windowDays: number,
): Set<string> {
  const lower = windowLowerBound(beforeISO, windowDays);
  const ids = new Set<string>();
  for (const [date, plan] of Object.entries(plans)) {
    if (date < lower || date >= beforeISO) continue; // finestra [lower, before)
    for (const s of plan.slots) ids.add(s.activityId);
  }
  return ids;
}

/**
 * Insieme delle categorie assegnate nei `days` giorni strettamente prima di
 * `beforeISO` (categoria derivata dal prefisso id). Usato per il bonus di
 * freschezza di categoria nello scoring (R7).
 */
export function categoriesInLastDays(
  plans: Record<string, DayPlan>,
  beforeISO: string,
  days: number,
): Set<CategoryId> {
  const lower = windowLowerBound(beforeISO, days);
  const cats = new Set<CategoryId>();
  for (const [date, plan] of Object.entries(plans)) {
    if (date < lower || date >= beforeISO) continue;
    for (const s of plan.slots) cats.add(categoryOf(s.activityId));
  }
  return cats;
}

/**
 * Mappa attività → data ISO di *ultimo* utilizzo (la più recente) strettamente
 * prima di `beforeISO`. Serve allo scoring ("mai usata o >30gg") e al fallback
 * estremo (CAL meno-recentemente usata). L'aggregazione è un massimo, quindi è
 * indipendente dall'ordine di iterazione (determinismo R9).
 */
export function lastUsedMap(
  plans: Record<string, DayPlan>,
  beforeISO: string,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const [date, plan] of Object.entries(plans)) {
    if (date >= beforeISO) continue;
    for (const s of plan.slots) {
      const prev = m.get(s.activityId);
      if (prev === undefined || date > prev) m.set(s.activityId, date);
    }
  }
  return m;
}
