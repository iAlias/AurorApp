import { addDays, differenceInCalendarDays, format, getDay, parseISO } from 'date-fns';
import type {
  Activity,
  CategoryId,
  ChildProfile,
  DayPlan,
  InterestTag,
  PlannedSlot,
  Settings,
  SlotId,
  SpaceTag,
  Weather,
} from '../catalog/types';
import { hashSeed, mulberry32 } from './rng';
import { deriveSlots, type SlotDef } from './slots';
import { categoriesInLastDays, categoryOf, lastUsedMap, recentActivityIds } from './history';

// ——— Contesto e costanti ———

export interface GenContext {
  profile: ChildProfile;
  settings: Settings;
  catalog: Activity[];
  plans: Record<string, DayPlan>;
}

const MAX_SWAPS = 10; // dopo 10 swap → exhausted (messaggio E9 lato chiamante)
const RELAX_WINDOWS = [14, 10, 7, 4]; // scala di rilassamento anti-noia (§7.3)
const PICK_WEIGHTS = [5, 4, 3, 2, 1]; // pesi per l'estrazione fra i primi 5 per score
const SLOT_ORDER: Record<SlotId, number> = { M1: 0, M2: 1, P1: 2, P2: 3, SERA: 4 };

/** Sab/dom via date-fns; getDay: 0=domenica, 6=sabato (invariante rispetto al fuso). */
export function isFamilyDay(dateISO: string): boolean {
  const d = getDay(parseISO(dateISO));
  return d === 0 || d === 6;
}

// ——— Stato del giorno in costruzione ———

interface DayState {
  dateISO: string;
  weather: Weather;
  familyDay: boolean;
  usedCategories: Set<CategoryId>; // categorie già assegnate oggi
  usedActivityIds: Set<string>; // attività già assegnate oggi (no ripetizioni nel giorno)
  usedMess2: boolean; // esiste già un'attività mess=2 oggi (malus scoring)
  yesterdayBySlot: Partial<Record<SlotId, CategoryId>>; // categoria di ieri per lo stesso slot
  // precalcoli per-giorno (perf + determinismo: nessun ricalcolo per candidato)
  lastUsed: Map<string, string>;
  categoriesLast7: Set<CategoryId>;
  profileInterests: Set<InterestTag>;
}

// ——— Vincoli hard ———

/**
 * weatherOk (§7.3):
 *  - pioggia → l'attività non è 'esterno' e non richiede asciutto ('entrambi' ok)
 *  - caldo   → negli slot centrali M2/P2 niente 'esterno'; M1/P1 (ore fresche, P6) ok
 *  - sole    → nessun vincolo
 */
function weatherOk(a: Activity, weather: Weather, slot: SlotDef): boolean {
  if (weather === 'pioggia') return a.place !== 'esterno' && !a.requiresDry;
  if (weather === 'caldo') {
    if (slot.slotId === 'M2' || slot.slotId === 'P2') return a.place !== 'esterno';
    return true;
  }
  return true; // sole
}

/** placeOk: un'attività 'esterno' richiede almeno uno spazio esterno (giardino/terrazzo/parco). */
function placeOk(a: Activity, spaces: SpaceTag[]): boolean {
  if (a.place !== 'esterno') return true;
  return spaces.some((s) => s === 'giardino' || s === 'terrazzo' || s === 'parco');
}

function interestMatch(a: Activity, interests: Set<InterestTag>): boolean {
  return a.interests.some((t) => interests.has(t));
}

// ——— Scoring (§7.3) ———

/**
 * score = 3·(interessi∩profilo) + 2·(mai usata o >30gg) + 2·(categoria assente ultimi 7gg)
 *       + 1·(caldo && heatFriendly) + 1·(familyDay && family)
 *       − 2·(mess2 e già una mess2 oggi) − 1·(categoria == categoria di ieri per questo slot)
 */
function scoreActivity(a: Activity, slot: SlotDef, st: DayState): number {
  const interest = interestMatch(a, st.profileInterests) ? 1 : 0;
  const last = st.lastUsed.get(a.id);
  const neverOrOld =
    last === undefined || differenceInCalendarDays(parseISO(st.dateISO), parseISO(last)) > 30
      ? 1
      : 0;
  const catFresh = st.categoriesLast7.has(a.category) ? 0 : 1;
  const heat = st.weather === 'caldo' && a.heatFriendly ? 1 : 0;
  const fam = st.familyDay && a.family ? 1 : 0;
  const messPenalty = a.mess === 2 && st.usedMess2 ? 1 : 0;
  const yesterdayPenalty = a.category === st.yesterdayBySlot[slot.slotId] ? 1 : 0;
  return 3 * interest + 2 * neverOrOld + 2 * catFresh + heat + fam - 2 * messPenalty - yesterdayPenalty;
}

/**
 * Estrazione pesata: mappa il pool in {activity, score}, ordina desc (pareggi risolti
 * dall'ordine di catalogo per determinismo), tiene i primi 5 ed estrae con pesi [5,4,3,2,1]
 * normalizzati sulla lunghezza reale dello slice, usando `rng`.
 */
function weightedPick(
  pool: Activity[],
  slot: SlotDef,
  st: DayState,
  rng: () => number,
): { activity: Activity; score: number } {
  const scored = pool
    .map((activity, idx) => ({ activity, score: scoreActivity(activity, slot, st), idx }))
    .sort((x, y) => y.score - x.score || x.idx - y.idx);
  const top = scored.slice(0, PICK_WEIGHTS.length);
  const weights = PICK_WEIGHTS.slice(0, top.length);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let k = 0; k < top.length; k++) {
    if (r < weights[k]) return { activity: top[k].activity, score: top[k].score };
    r -= weights[k];
  }
  const lastTop = top[top.length - 1]; // sicurezza floating-point: l'ultimo dello slice
  return { activity: lastTop.activity, score: lastTop.score };
}

/**
 * Fra le attività `pool`, la meno-recentemente usata secondo `lastUsed`:
 * mai usata = la più "vecchia"; a parità vince l'ordine di catalogo (primo). Ris. controller #3.
 */
function leastRecentlyUsed(pool: Activity[], lastUsed: Map<string, string>): Activity {
  let best = pool[0];
  let bestKey = lastUsed.get(best.id); // undefined = mai usata
  for (let i = 1; i < pool.length; i++) {
    const a = pool[i];
    const k = lastUsed.get(a.id);
    const older =
      (k === undefined && bestKey !== undefined) ||
      (k !== undefined && bestKey !== undefined && k < bestKey);
    if (older) {
      best = a;
      bestKey = k;
    }
  }
  return best;
}

// ——— Pipeline per slot (§7.3, implementata esattamente) ———

interface PickOpts {
  extraFilter?: (a: Activity) => boolean; // vincolo hard aggiuntivo (R6-bis)
  noFallback?: boolean; // R6-bis: pool vuoto → null invece del fallback CAL
  // R6-bis: nessun rilassamento. Un solo tentativo alla finestra primaria (14gg, categoria
  // non ripetibile): così l'iniezione anti-monotonia non reintroduce mai una ripetizione
  // entro 14gg (P-GEN-1) né un doppione di categoria (P-GEN-2). Se vuoto → "lascia com'è".
  noRelax?: boolean;
}

function pickForSlot(
  slot: SlotDef,
  st: DayState,
  rng: () => number,
  ctx: GenContext,
  excludeId?: string,
  opts?: PickOpts,
): { activity: Activity; score: number } | null {
  const maxW = opts?.noRelax ? 1 : RELAX_WINDOWS.length + 1;
  for (let w = 0; w < maxW; w++) {
    const allowRepeatCategory = w === RELAX_WINDOWS.length; // ultimo rilassamento
    const windowDays = RELAX_WINDOWS[Math.min(w, RELAX_WINDOWS.length - 1)];
    const recent = recentActivityIds(ctx.plans, st.dateISO, windowDays);
    const pool = ctx.catalog.filter(
      (a) =>
        a.id !== excludeId &&
        (slot.onlyCategory ? a.category === slot.onlyCategory : true) &&
        !recent.has(a.id) &&
        !st.usedActivityIds.has(a.id) && // controller #9: no stessa attività due volte nel giorno
        (allowRepeatCategory || slot.onlyCategory || !st.usedCategories.has(a.category)) &&
        slot.energies.includes(a.energy) &&
        weatherOk(a, st.weather, slot) &&
        placeOk(a, ctx.profile.spaces) &&
        a.durationMin <= slot.durationMin &&
        (opts?.extraFilter ? opts.extraFilter(a) : true),
    );
    if (pool.length > 0) return weightedPick(pool, slot, st, rng);
  }
  if (opts?.noFallback) return null;
  // fallback estremo: fra le CAL compatibili per luogo, la meno-recentemente usata.
  const calPool = ctx.catalog.filter((a) => a.category === 'CAL' && placeOk(a, ctx.profile.spaces));
  return { activity: leastRecentlyUsed(calPool, st.lastUsed), score: -1 };
}

// ——— Costruzione dello stato e del giorno ———

function seedString(
  profile: ChildProfile,
  dateISO: string,
  regenNonce: number,
  weather: Weather,
): string {
  return `${profile.createdAt}|${dateISO}|${regenNonce}|${weather}`;
}

function activityById(ctx: GenContext, id: string): Activity | undefined {
  return ctx.catalog.find((a) => a.id === id);
}

function makeDayState(
  dateISO: string,
  weather: Weather,
  familyDay: boolean,
  ctx: GenContext,
): DayState {
  const prevISO = format(addDays(parseISO(dateISO), -1), 'yyyy-MM-dd');
  const prev = ctx.plans[prevISO];
  const yesterdayBySlot: Partial<Record<SlotId, CategoryId>> = {};
  if (prev) {
    for (const s of prev.slots) yesterdayBySlot[s.slotId] = categoryOf(s.activityId);
  }
  return {
    dateISO,
    weather,
    familyDay,
    usedCategories: new Set(),
    usedActivityIds: new Set(),
    usedMess2: false,
    yesterdayBySlot,
    lastUsed: lastUsedMap(ctx.plans, dateISO),
    categoriesLast7: categoriesInLastDays(ctx.plans, dateISO, 7),
    profileInterests: new Set(ctx.profile.interests),
  };
}

function markUsed(st: DayState, a: Activity): void {
  st.usedCategories.add(a.category);
  st.usedActivityIds.add(a.id);
  if (a.mess === 2) st.usedMess2 = true;
}

interface BuiltSlot {
  def: SlotDef;
  planned: PlannedSlot;
  act: Activity;
  score: number | null; // null = slot preservato (done), non rigenerabile
  eligible: boolean; // true = scelto ora, può essere ripescato da R6-bis
}

/**
 * Regola maestra R6-bis (post-riempimento): se OGNI slot filled tranne SERA matcha gli
 * interessi del profilo, ripete il pick per lo slot con score minimo (tra quelli
 * ripescabili) col filtro hard aggiuntivo `interessi∩profilo = ∅`. Se il pool è vuoto
 * lascia com'è (nessun fallback CAL).
 *
 * Deviazione documentata dalla risoluzione controller #7 ("stessa scala di rilassamento"):
 * il ripescaggio R6-bis NON rilassa (noRelax). La scala di rilassamento reintrodurrebbe
 * attività usate <14gg (violando P-GEN-1) e, all'ultimo gradino, categorie duplicate
 * (violando P-GEN-2) — entrambi normativi. Un solo tentativo alla finestra primaria onora
 * "se il pool è vuoto lascia com'è" del brief senza sacrificare la freschezza a 14gg.
 */
function applyR6bis(built: BuiltSlot[], st: DayState, rng: () => number, ctx: GenContext): void {
  const nonSera = built.filter((b) => b.def.slotId !== 'SERA');
  if (nonSera.length === 0) return;
  if (!nonSera.every((b) => interestMatch(b.act, st.profileInterests))) return;

  const candidates = nonSera.filter((b) => b.eligible && b.score !== null);
  if (candidates.length === 0) return;
  candidates.sort(
    (x, y) => (x.score ?? 0) - (y.score ?? 0) || SLOT_ORDER[x.def.slotId] - SLOT_ORDER[y.def.slotId],
  );
  const target = candidates[0];

  // Stato "come se" si ripescasse target: usati = tutti gli altri slot (no doppioni categoria/id).
  const stR = makeDayState(st.dateISO, st.weather, st.familyDay, ctx);
  for (const b of built) {
    if (b === target) continue;
    markUsed(stR, b.act);
  }
  const res = pickForSlot(target.def, stR, rng, ctx, target.planned.activityId, {
    extraFilter: (a) => !interestMatch(a, st.profileInterests),
    noFallback: true,
    noRelax: true,
  });
  if (!res) return; // pool vuoto → lascia il piano com'è
  target.planned = {
    slotId: target.def.slotId,
    activityId: res.activity.id,
    status: 'planned',
    swapCount: 0,
  };
  target.act = res.activity;
}

/**
 * Cuore del generatore. `preserve` = slot da mantenere verbatim (es. slot done in
 * rigenerazione); `special` forza un giorno speciale (slots []). Gli slot preservati
 * pre-occupano categoria/id/mess così che i pick rigenerati non creino doppioni.
 */
function buildDay(
  dateISO: string,
  weather: Weather,
  regenNonce: number,
  ctx: GenContext,
  preserve: Map<SlotId, PlannedSlot>,
  special: DayPlan['special'],
): DayPlan {
  const familyDay = isFamilyDay(dateISO);
  const sp = special ?? ctx.plans[dateISO]?.special;
  if (sp) {
    return { date: dateISO, familyDay, special: sp, weather, regenNonce, slots: [] };
  }

  const slotDefs = deriveSlots(ctx.settings.routine, ctx.settings.meals, familyDay);
  const rng = mulberry32(hashSeed(seedString(ctx.profile, dateISO, regenNonce, weather)));
  const st = makeDayState(dateISO, weather, familyDay, ctx);

  // Pre-occupa lo stato con gli slot preservati (così i pick evitano le loro categorie/id).
  for (const def of slotDefs) {
    const kept = preserve.get(def.slotId);
    if (!kept) continue;
    const act = activityById(ctx, kept.activityId);
    if (act) markUsed(st, act);
  }

  const built: BuiltSlot[] = [];
  for (const def of slotDefs) {
    const kept = preserve.get(def.slotId);
    if (kept) {
      const act = activityById(ctx, kept.activityId);
      // Se l'id preservato non esiste nel catalogo, ripiega su un pick normale.
      if (act) {
        built.push({ def, planned: kept, act, score: null, eligible: false });
        continue;
      }
    }
    const res = pickForSlot(def, st, rng, ctx)!; // percorso normale: mai null (fallback CAL)
    markUsed(st, res.activity);
    built.push({
      def,
      planned: { slotId: def.slotId, activityId: res.activity.id, status: 'planned', swapCount: 0 },
      act: res.activity,
      score: res.score,
      eligible: true,
    });
  }

  applyR6bis(built, st, rng, ctx);

  return {
    date: dateISO,
    familyDay,
    weather,
    regenNonce,
    slots: built.map((b) => b.planned),
  };
}

// ——— API pubblica ———

export function generateDayPlan(
  dateISO: string,
  weather: Weather,
  regenNonce: number,
  ctx: GenContext,
): DayPlan {
  return buildDay(dateISO, weather, regenNonce, ctx, new Map(), undefined);
}

/**
 * Genera in ordine cronologico da vacationStart fino a `dateISO` incluso, saltando i
 * giorni già presenti in ctx.plans. Ritorna SOLO i piani nuovi (§7.2). Ogni giorno vede
 * quelli precedenti (history/"ieri" progressivi) accumulandoli in una copia di lavoro.
 */
export function materializeUpTo(dateISO: string, ctx: GenContext): Record<string, DayPlan> {
  const start = ctx.profile.vacationStart;
  const result: Record<string, DayPlan> = {};
  if (dateISO < start) return result;

  const working: Record<string, DayPlan> = { ...ctx.plans };
  let cursor = parseISO(start);
  const end = parseISO(dateISO);
  while (differenceInCalendarDays(end, cursor) >= 0) {
    const iso = format(cursor, 'yyyy-MM-dd');
    if (!working[iso]) {
      const plan = generateDayPlan(iso, 'sole', 0, { ...ctx, plans: working });
      working[iso] = plan;
      result[iso] = plan;
    }
    cursor = addDays(cursor, 1);
  }
  return result;
}

/**
 * Swap di un singolo slot: rng = mulberry32(hashSeed(stessa stringa seed) + swapCount + 1),
 * esclude l'attività corrente, incrementa swapCount. `exhausted` diventa true una volta
 * raggiunti 10 swap (il chiamante mostra E9). Non muta l'input.
 */
export function swapActivity(
  plan: DayPlan,
  slotId: SlotId,
  ctx: GenContext,
): { plan: DayPlan; exhausted: boolean } {
  const cur = plan.slots.find((s) => s.slotId === slotId);
  if (!cur) return { plan, exhausted: false };
  if (cur.swapCount >= MAX_SWAPS) return { plan, exhausted: true };

  const slotDefs = deriveSlots(ctx.settings.routine, ctx.settings.meals, plan.familyDay);
  const def = slotDefs.find((d) => d.slotId === slotId);
  if (!def) return { plan, exhausted: false };

  const seed = hashSeed(seedString(ctx.profile, plan.date, plan.regenNonce, plan.weather));
  const rng = mulberry32(seed + cur.swapCount + 1);
  const st = makeDayState(plan.date, plan.weather, plan.familyDay, ctx);
  // pre-occupa con gli ALTRI slot (non quello da swappare) per evitare doppioni.
  for (const s of plan.slots) {
    if (s.slotId === slotId) continue;
    const act = activityById(ctx, s.activityId);
    if (act) markUsed(st, act);
  }
  const res = pickForSlot(def, st, rng, ctx, cur.activityId)!;
  const newCount = cur.swapCount + 1;
  const slots = plan.slots.map((s) =>
    s.slotId === slotId ? { ...s, activityId: res.activity.id, swapCount: newCount } : s,
  );
  return { plan: { ...plan, slots }, exhausted: newCount >= MAX_SWAPS };
}

/** Rigenera il giorno: nonce+1, nuovo pick per gli slot NON done; done intatti (attività E stato). */
export function regenerateDay(plan: DayPlan, ctx: GenContext): DayPlan {
  const preserve = new Map<SlotId, PlannedSlot>();
  for (const s of plan.slots) if (s.status === 'done') preserve.set(s.slotId, s);
  return buildDay(plan.date, plan.weather, plan.regenNonce + 1, ctx, preserve, plan.special);
}

/**
 * Applica un nuovo meteo: rigenera SOLO gli slot non-done la cui attività corrente non
 * supera weatherOk col nuovo meteo (FR-4). Gli slot done non vengono MAI toccati; quelli
 * non-done compatibili mantengono l'attività. Il seed usa il NUOVO valore meteo. Non muta l'input.
 */
export function applyWeather(plan: DayPlan, weather: Weather, ctx: GenContext): DayPlan {
  if (plan.special) return { ...plan, weather }; // giorno speciale: nessuno slot da toccare

  const slotDefs = deriveSlots(ctx.settings.routine, ctx.settings.meals, plan.familyDay);
  const defById = new Map(slotDefs.map((d) => [d.slotId, d]));
  const rng = mulberry32(hashSeed(seedString(ctx.profile, plan.date, plan.regenNonce, weather)));
  const st = makeDayState(plan.date, weather, plan.familyDay, ctx);

  // Determina quali slot rigenerare: non-done con attività corrente incompatibile.
  const toRepick = new Set<SlotId>();
  for (const s of plan.slots) {
    if (s.status === 'done') continue;
    const def = defById.get(s.slotId);
    const act = activityById(ctx, s.activityId);
    if (def && act && !weatherOk(act, weather, def)) toRepick.add(s.slotId);
  }

  // Pre-occupa lo stato con gli slot mantenuti (done + non-done compatibili).
  for (const s of plan.slots) {
    if (toRepick.has(s.slotId)) continue;
    const act = activityById(ctx, s.activityId);
    if (act) markUsed(st, act);
  }

  const slots: PlannedSlot[] = [];
  for (const def of slotDefs) {
    const cur = plan.slots.find((s) => s.slotId === def.slotId);
    if (!cur) continue;
    if (!toRepick.has(def.slotId)) {
      slots.push(cur);
      continue;
    }
    const res = pickForSlot(def, st, rng, ctx, cur.activityId)!;
    markUsed(st, res.activity);
    slots.push({ ...cur, activityId: res.activity.id });
  }
  return { ...plan, weather, slots };
}
