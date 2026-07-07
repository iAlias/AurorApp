import { addDays, format, getDay, parseISO } from 'date-fns';
import { ACTIVITIES } from '../../../src/core/catalog/activities';
import {
  ALL_INTERESTS,
  ALL_SPACES,
  DEFAULT_SETTINGS,
  type ChildProfile,
  type DayPlan,
  type SlotId,
  type SpaceTag,
} from '../../../src/core/catalog/types';
import { hashSeed, mulberry32 } from '../../../src/core/planner/rng';
import {
  applyWeather,
  generateDayPlan,
  isFamilyDay,
  materializeUpTo,
  regenerateDay,
  swapActivity,
  type GenContext,
} from '../../../src/core/planner/generator';
import {
  categoriesInLastDays,
  recentActivityIds,
} from '../../../src/core/planner/history';

// ——— Helpers (RNG seedato, mai Math.random — R9 riproducibilità) ———

const VAC_START = '2026-06-15'; // lunedì
const VAC_END = '2026-09-30';

function drawSubset<T>(all: readonly T[], rng: () => number): T[] {
  const out: T[] = [];
  for (const x of all) if (rng() < 0.5) out.push(x);
  if (out.length === 0) out.push(all[Math.floor(rng() * all.length)]);
  return out;
}

function seededProfile(i: number): ChildProfile {
  const rng = mulberry32(hashSeed(`profile-${i}`));
  const interests = drawSubset(ALL_INTERESTS, rng);
  const spaces = drawSubset(ALL_SPACES, rng);
  return {
    id: `p${i}`,
    name: `Bimba ${i}`,
    avatarId: 'avatar-1',
    birthdate: '2023-03-01',
    interests,
    spaces,
    vacationStart: VAC_START,
    vacationEnd: VAC_END,
    createdAt: `2026-06-0${(i % 9) + 1}T07:30:00.000Z`,
  };
}

function makeCtx(profile: ChildProfile, plans: Record<string, DayPlan> = {}): GenContext {
  return { profile, settings: DEFAULT_SETTINGS, catalog: ACTIVITIES, plans };
}

function isoRange(startISO: string, count: number): string[] {
  const out: string[] = [];
  let d = parseISO(startISO);
  for (let i = 0; i < count; i++) {
    out.push(format(d, 'yyyy-MM-dd'));
    d = addDays(d, 1);
  }
  return out;
}

function categoryOf(activityId: string): string {
  return activityId.slice(0, activityId.indexOf('-'));
}

function actById(id: string) {
  const a = ACTIVITIES.find((x) => x.id === id);
  if (!a) throw new Error(`attività ${id} non trovata`);
  return a;
}

function dayWith(date: string, ids: string[]): DayPlan {
  const slotIds: SlotId[] = ['M1', 'M2', 'P1', 'P2', 'SERA'];
  return {
    date,
    familyDay: false,
    weather: 'sole',
    regenNonce: 0,
    slots: ids.map((activityId, k) => ({
      slotId: slotIds[k],
      activityId,
      status: 'planned' as const,
      swapCount: 0,
    })),
  };
}

// Materializzazione memoizzata (deterministica): un solo passaggio 92gg per profilo.
const materializeCache = new Map<number, Record<string, DayPlan>>();
function plansFor(i: number): Record<string, DayPlan> {
  let p = materializeCache.get(i);
  if (!p) {
    const ctx = makeCtx(seededProfile(i));
    const dates = isoRange(VAC_START, 92);
    p = materializeUpTo(dates[dates.length - 1], ctx);
    materializeCache.set(i, p);
  }
  return p;
}

// ——— history.ts ———

describe('history', () => {
  test('recentActivityIds raccoglie gli id nelle finestre corrette (strettamente prima)', () => {
    const plans: Record<string, DayPlan> = {
      '2026-07-01': dayWith('2026-07-01', ['MOT-01']),
      '2026-07-05': dayWith('2026-07-05', ['CRE-02']),
      '2026-07-09': dayWith('2026-07-09', ['SEN-03']),
    };
    expect(recentActivityIds(plans, '2026-07-10', 7)).toEqual(new Set(['CRE-02', 'SEN-03']));
    expect(recentActivityIds(plans, '2026-07-10', 14)).toEqual(
      new Set(['MOT-01', 'CRE-02', 'SEN-03']),
    );
    // beforeISO è escluso (strettamente prima)
    expect(recentActivityIds(plans, '2026-07-09', 14).has('SEN-03')).toBe(false);
  });

  test('categoriesInLastDays deriva la categoria dal prefisso id', () => {
    const plans: Record<string, DayPlan> = {
      '2026-07-08': dayWith('2026-07-08', ['MOT-01', 'CAL-01']),
    };
    expect(categoriesInLastDays(plans, '2026-07-10', 7)).toEqual(new Set(['MOT', 'CAL']));
    expect(categoriesInLastDays(plans, '2026-07-10', 1)).toEqual(new Set());
  });
});

describe('isFamilyDay', () => {
  test('sabato e domenica sono familyDay, il lunedì no', () => {
    expect(isFamilyDay('2026-07-04')).toBe(true); // sabato
    expect(isFamilyDay('2026-07-05')).toBe(true); // domenica
    expect(isFamilyDay('2026-07-06')).toBe(false); // lunedì
  });
});

// ——— P-GEN-3 · determinismo (R9) ———

describe('P-GEN-3 · determinismo', () => {
  test('generateDayPlan è identico su 1000 chiamate con gli stessi input', () => {
    const ctx = makeCtx(seededProfile(1));
    const first = generateDayPlan('2026-07-10', 'sole', 0, ctx);
    for (let i = 0; i < 1000; i++) {
      expect(generateDayPlan('2026-07-10', 'sole', 0, ctx)).toEqual(first);
    }
  });

  test('materializeUpTo è identico su ripetizioni', () => {
    const ctx = makeCtx(seededProfile(2));
    expect(materializeUpTo('2026-08-01', ctx)).toEqual(materializeUpTo('2026-08-01', ctx));
  });

  test('nonce diversi producono piani diversi', () => {
    const ctx = makeCtx(seededProfile(3));
    const variants = new Set<string>();
    for (let n = 0; n < 5; n++) {
      variants.add(JSON.stringify(generateDayPlan('2026-07-10', 'sole', n, ctx)));
    }
    expect(variants.size).toBeGreaterThan(1);
  });
});

// ——— P-GEN-1 · nessuna ripetizione entro 14 giorni ———

describe('P-GEN-1 · nessuna ripetizione entro 14gg', () => {
  test('92 giorni × 20 profili: tasso di rilassamento (ripetizioni entro 14gg) < 1%', () => {
    let totalPicks = 0;
    let within14 = 0;
    for (let i = 0; i < 20; i++) {
      const plans = plansFor(i);
      const dates = Object.keys(plans).sort();
      for (const date of dates) {
        const before14 = new Set<string>();
        for (let k = 1; k <= 14; k++) {
          const d = format(addDays(parseISO(date), -k), 'yyyy-MM-dd');
          const prev = plans[d];
          if (prev) for (const s of prev.slots) before14.add(s.activityId);
        }
        for (const s of plans[date].slots) {
          totalPicks++;
          if (before14.has(s.activityId)) within14++;
        }
      }
    }
    expect(totalPicks).toBeGreaterThan(0);
    expect(within14 / totalPicks).toBeLessThan(0.01);
  });
});

// ——— P-GEN-2 · nessuna categoria duplicata nello stesso giorno (SERA=CAL esclusa) ———

describe('P-GEN-2 · categorie e attività non duplicate nel giorno', () => {
  test('20 profili × 92 giorni: categorie non-SERA distinte; nessuna attività ripetuta nel giorno', () => {
    for (let i = 0; i < 20; i++) {
      const plans = plansFor(i);
      for (const date of Object.keys(plans)) {
        const slots = plans[date].slots;
        const nonSeraCats = slots
          .filter((s) => s.slotId !== 'SERA')
          .map((s) => categoryOf(s.activityId));
        expect(new Set(nonSeraCats).size).toBe(nonSeraCats.length);
        const ids = slots.map((s) => s.activityId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

// ——— P-GEN-4 · vincoli meteo ———

describe('P-GEN-4 · vincoli meteo', () => {
  test("pioggia → nessuna attività 'esterno' e nessuna requiresDry", () => {
    for (let i = 0; i < 8; i++) {
      const ctx = makeCtx(seededProfile(i));
      for (const date of isoRange('2026-07-06', 10)) {
        for (const s of generateDayPlan(date, 'pioggia', 0, ctx).slots) {
          const a = actById(s.activityId);
          expect(a.place).not.toBe('esterno');
          expect(a.requiresDry).toBe(false);
        }
      }
    }
  });

  test("caldo → nessuna attività 'esterno' in M2/P2 (M1/P1 ammessi)", () => {
    for (let i = 0; i < 8; i++) {
      const ctx = makeCtx(seededProfile(i));
      for (const date of isoRange('2026-07-06', 10)) {
        for (const s of generateDayPlan(date, 'caldo', 0, ctx).slots) {
          if (s.slotId === 'M2' || s.slotId === 'P2') {
            expect(actById(s.activityId).place).not.toBe('esterno');
          }
        }
      }
    }
  });
});

// ——— P-GEN-5 · varietà settimanale ———

describe('P-GEN-5 · ogni settimana lun–ven ha ≥7 categorie distinte', () => {
  test('20 profili', () => {
    for (let i = 0; i < 20; i++) {
      const plans = plansFor(i);
      for (const date of Object.keys(plans).sort()) {
        if (getDay(parseISO(date)) !== 1) continue; // lunedì
        const week = isoRange(date, 5); // lun→ven
        if (!week.every((d) => plans[d])) continue;
        const cats = new Set<string>();
        for (const d of week) for (const s of plans[d].slots) cats.add(categoryOf(s.activityId));
        expect(cats.size).toBeGreaterThanOrEqual(7);
      }
    }
  });
});

// ——— Casi speciali: weekend, giorno speciale, swap, applyWeather ———

describe('casi speciali', () => {
  test('weekend (familyDay) → solo 2 slot [M1, P1]', () => {
    const ctx = makeCtx(seededProfile(1));
    let checked = 0;
    for (const date of isoRange(VAC_START, 14)) {
      if (!isFamilyDay(date)) continue;
      const plan = generateDayPlan(date, 'sole', 0, ctx);
      expect(plan.familyDay).toBe(true);
      expect(plan.slots.map((s) => s.slotId)).toEqual(['M1', 'P1']);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('giorno speciale → slots [] e special preservato', () => {
    const date = '2026-07-08';
    const special = { kind: 'mare' as const };
    const existing: DayPlan = {
      date,
      familyDay: isFamilyDay(date),
      special,
      weather: 'sole',
      regenNonce: 0,
      slots: [],
    };
    const ctx = makeCtx(seededProfile(1), { [date]: existing });
    const plan = generateDayPlan(date, 'sole', 0, ctx);
    expect(plan.slots).toEqual([]);
    expect(plan.special).toEqual(special);
  });

  test('swap cambia solo lo slot indicato e incrementa swapCount', () => {
    const ctx = makeCtx(seededProfile(1));
    const plan = generateDayPlan('2026-07-08', 'sole', 0, ctx);
    const before = plan.slots.find((s) => s.slotId === 'M1')!;
    const { plan: swapped } = swapActivity(plan, 'M1', ctx);
    const after = swapped.slots.find((s) => s.slotId === 'M1')!;
    expect(after.activityId).not.toBe(before.activityId);
    expect(after.swapCount).toBe(1);
    for (const id of ['M2', 'P1', 'P2', 'SERA'] as SlotId[]) {
      expect(swapped.slots.find((s) => s.slotId === id)).toEqual(
        plan.slots.find((s) => s.slotId === id),
      );
    }
    // non muta l'input
    expect(plan.slots.find((s) => s.slotId === 'M1')!.activityId).toBe(before.activityId);
  });

  test('10 swap → exhausted; l\'11º non modifica il piano', () => {
    const ctx = makeCtx(seededProfile(1));
    let plan = generateDayPlan('2026-07-08', 'sole', 0, ctx);
    let exhausted = false;
    for (let k = 0; k < 10; k++) {
      const r = swapActivity(plan, 'M1', ctx);
      plan = r.plan;
      exhausted = r.exhausted;
    }
    expect(exhausted).toBe(true);
    expect(plan.slots.find((s) => s.slotId === 'M1')!.swapCount).toBe(10);
    const again = swapActivity(plan, 'M1', ctx);
    expect(again.exhausted).toBe(true);
    expect(again.plan).toEqual(plan);
  });

  test('regenerateDay: nonce+1, slot done intatti (attività E stato)', () => {
    const ctx = makeCtx(seededProfile(4));
    const base = generateDayPlan('2026-07-08', 'sole', 0, ctx);
    const withDone: DayPlan = {
      ...base,
      slots: base.slots.map((s) => (s.slotId === 'M1' ? { ...s, status: 'done' as const } : s)),
    };
    const regen = regenerateDay(withDone, ctx);
    expect(regen.regenNonce).toBe(1);
    expect(regen.slots.find((s) => s.slotId === 'M1')).toEqual(
      withDone.slots.find((s) => s.slotId === 'M1'),
    );
    for (const s of regen.slots) {
      if (s.slotId !== 'M1') expect(s.status).toBe('planned');
    }
  });

  test('applyWeather: slot done mai toccato; incompatibili rigenerati; compatibili invariati', () => {
    const date = '2026-07-08';
    const profile: ChildProfile = {
      ...seededProfile(1),
      spaces: ['casa', 'giardino', 'terrazzo', 'parco'] as SpaceTag[],
    };
    // MOT-10 e CRE-07 sono place 'esterno'
    const plan: DayPlan = {
      date,
      familyDay: isFamilyDay(date),
      weather: 'sole',
      regenNonce: 0,
      slots: [
        { slotId: 'M1', activityId: 'MOT-10', status: 'done', swapCount: 0 }, // esterno MA done
        { slotId: 'M2', activityId: 'SEN-01', status: 'planned', swapCount: 0 }, // casa
        { slotId: 'P1', activityId: 'CRE-07', status: 'planned', swapCount: 0 }, // esterno non-done
        { slotId: 'P2', activityId: 'COG-13', status: 'planned', swapCount: 0 }, // casa
        { slotId: 'SERA', activityId: 'CAL-01', status: 'planned', swapCount: 0 }, // casa
      ],
    };
    const ctx = makeCtx(profile);
    const out = applyWeather(plan, 'pioggia', ctx);

    expect(out.weather).toBe('pioggia');
    // M1 done esterno → intatto nonostante incompatibile
    expect(out.slots.find((s) => s.slotId === 'M1')).toEqual({
      slotId: 'M1',
      activityId: 'MOT-10',
      status: 'done',
      swapCount: 0,
    });
    // P1 esterno non-done → rigenerato in attività non-esterno
    const p1 = out.slots.find((s) => s.slotId === 'P1')!;
    expect(p1.activityId).not.toBe('CRE-07');
    expect(actById(p1.activityId).place).not.toBe('esterno');
    // slot compatibili non-done → invariati
    expect(out.slots.find((s) => s.slotId === 'M2')!.activityId).toBe('SEN-01');
    expect(out.slots.find((s) => s.slotId === 'P2')!.activityId).toBe('COG-13');
    expect(out.slots.find((s) => s.slotId === 'SERA')!.activityId).toBe('CAL-01');
    // non muta l'input
    expect(plan.weather).toBe('sole');
    expect(plan.slots.find((s) => s.slotId === 'P1')!.activityId).toBe('CRE-07');
  });
});
