import type { Activity, BadgeId, CategoryId, DayPlan, ProgressState } from '../catalog/types';
import { categoryOf } from '../planner/history';
import { computeStreak, isDayComplete } from './streak';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  emoji: string;
  description: string;
}

/**
 * I 13 badge di FR-9. Nomi dalla spec, con le varianti `{f|m}` di `genderize`
 * accordate al profilo (gli id restano quelli storici, sono chiavi salvate). Emoji/description non normati
 * esplicitamente: per i badge tematici (categoria) riusiamo l'emoji della
 * categoria corrispondente in `CATEGORIES` così restano coerenti in tutta
 * l'app; per gli altri (streak, pasti) un'emoji distinta e festosa.
 */
export const BADGES: BadgeDef[] = [
  { id: 'prima-stella', name: 'Prima Stella', emoji: '⭐', description: 'Il primo giorno pieno di avventure!' },
  { id: 'tre-di-fila', name: 'Tre di Fila', emoji: '🔥', description: 'Tre giorni pieni di fila, che energia!' },
  {
    id: 'settimana-arcobaleno',
    name: 'Settimana Arcobaleno',
    emoji: '🌈',
    description: 'Una settimana intera di giornate piene!',
  },
  {
    id: 'mese-magico',
    name: 'Mese Magico',
    emoji: '🏆',
    description: 'Trenta giorni di fila: un mese davvero magico!',
  },
  {
    id: 'piccola-artista',
    name: 'Piccol{a|o} Artista',
    emoji: '🎨',
    description: 'Dieci attività di creatività, che artista!',
  },
  { id: 'esploratrice', name: '{Esploratrice|Esploratore}', emoji: '🌿', description: 'Dieci avventure nella natura!' },
  {
    id: 'sirenetta',
    name: '{Sirenetta|Pesciolino}',
    emoji: '💦',
    description: "Dieci giochi d'acqua, che {sirenetta|pesciolino}!",
  },
  { id: 'ballerina', name: '{Ballerina|Ballerino}', emoji: '🎵', description: 'Dieci attività di musica e ritmo!' },
  { id: 'chef-stellata', name: 'Chef Stellat{a|o}', emoji: '🍪', description: 'Otto ricette cucinate insieme!' },
  { id: 'scienziata', name: 'Scienziat{a|o}', emoji: '🧩', description: 'Dieci scoperte di logica!' },
  { id: 'campionessa', name: '{Campionessa|Campione}', emoji: '🤸', description: 'Quindici attività di movimento!' },
  { id: 'attrice', name: '{Attrice|Attore}', emoji: '🎭', description: 'Dieci giochi di finzione e travestimenti!' },
  {
    id: 'buona-forchetta',
    name: 'Buona Forchetta',
    emoji: '🍴',
    description: 'Dieci pasti sereni completati col timer!',
  },
];

const EMPTY_COUNTS: Record<CategoryId, number> = {
  MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
};

/**
 * Conteggio slot `done` per categoria su tutti i piani. La categoria si
 * cerca prima nel catalogo (fonte primaria, robusta a eventuali id non
 * standard) e solo in fallback si deriva dal prefisso dell'id (Task 12,
 * `categoryOf`) — evitando di duplicare quella logica.
 */
export function doneByCategory(
  plans: Record<string, DayPlan>,
  catalog: Activity[],
): Record<CategoryId, number> {
  const categoryById = new Map(catalog.map((a) => [a.id, a.category] as const));
  const counts: Record<CategoryId, number> = { ...EMPTY_COUNTS };
  for (const plan of Object.values(plans)) {
    for (const slot of plan.slots) {
      if (slot.status !== 'done') continue;
      const cat = categoryById.get(slot.activityId) ?? categoryOf(slot.activityId);
      counts[cat] += 1;
    }
  }
  return counts;
}

const CATEGORY_THRESHOLDS: Partial<Record<BadgeId, { cat: CategoryId; min: number }>> = {
  'piccola-artista': { cat: 'CRE', min: 10 },
  esploratrice: { cat: 'NAT', min: 10 },
  sirenetta: { cat: 'ACQ', min: 10 },
  ballerina: { cat: 'MUS', min: 10 },
  'chef-stellata': { cat: 'CUC', min: 8 },
  scienziata: { cat: 'COG', min: 10 },
  campionessa: { cat: 'MOT', min: 15 },
  attrice: { cat: 'SIM', min: 10 },
};

/**
 * Ricalcola `streak` e `doneByCategory` dai piani (fonte di verità, non
 * incrementale) e sblocca i badge le cui soglie sono raggiunte. Un badge già
 * sbloccato (`unlockedAt` presente) non viene mai toccato: i contatori sono
 * monotoni crescenti quindi non dovrebbe mai capitare di scendere sotto
 * soglia, ma anche se capitasse l'`unlockedAt` resta — i badge non si perdono
 * mai.
 */
export function checkUnlocks(
  state: ProgressState,
  plans: Record<string, DayPlan>,
  catalog: Activity[],
  todayISO: string,
  nowISO: string,
): { state: ProgressState; newBadges: BadgeId[] } {
  const streak = computeStreak(plans, todayISO);
  const categoryCounts = doneByCategory(plans, catalog);
  const anyDayComplete = Object.values(plans).some((p) => isDayComplete(p));

  const badges = { ...state.badges };
  const newBadges: BadgeId[] = [];

  function unlock(id: BadgeId): void {
    if (badges[id] !== undefined) return;
    badges[id] = nowISO;
    newBadges.push(id);
  }

  if (anyDayComplete) unlock('prima-stella');
  if (streak >= 3) unlock('tre-di-fila');
  if (streak >= 7) unlock('settimana-arcobaleno');
  if (streak >= 30) unlock('mese-magico');
  if (state.mealTimersCompleted >= 10) unlock('buona-forchetta');

  for (const [id, threshold] of Object.entries(CATEGORY_THRESHOLDS) as [
    BadgeId,
    { cat: CategoryId; min: number },
  ][]) {
    if (categoryCounts[threshold.cat] >= threshold.min) unlock(id);
  }

  return {
    state: {
      streak,
      lastStreakDate: todayISO,
      badges,
      doneByCategory: categoryCounts,
      mealTimersCompleted: state.mealTimersCompleted,
    },
    newBadges,
  };
}
