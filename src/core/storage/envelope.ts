import { z } from 'zod';
import { DEFAULT_SETTINGS } from '../catalog/types';
import type { StorageEnvelope } from '../catalog/types';

// ——— Chiave localStorage ———
export const STORAGE_KEY = 'arcobimbi.state.v1';
/** Chiave del vecchio nome dell'app: letta solo se manca quella nuova, così
 * chi aggiorna non perde profilo e progressi (la prima scrittura migra). */
export const LEGACY_STORAGE_KEY = 'aurorapp.state.v1';

// ——— Zod schema, campo per campo, speculare a StorageEnvelope (spec §6.2) ———

const InterestTagSchema = z.enum([
  'animali', 'disegno', 'musica', 'acqua', 'costruzioni',
  'travestimenti', 'natura', 'libri', 'cucinare', 'movimento',
]);

const SpaceTagSchema = z.enum(['casa', 'giardino', 'terrazzo', 'parco']);

const WeatherSchema = z.enum(['sole', 'pioggia', 'caldo', 'freddo']);

const SlotIdSchema = z.enum(['M1', 'M2', 'P1', 'P2', 'SERA']);

const SlotStatusSchema = z.enum(['planned', 'done', 'skipped']);

const ChildProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarId: z.string(),
  // Assente nei dati salvati prima della scelta bambina/bambino: erano tutti
  // profili di bambine, quindi 'f' preserva i testi che vedevano.
  gender: z.enum(['f', 'm']).default('f'),
  birthdate: z.string(),
  interests: z.array(InterestTagSchema),
  spaces: z.array(SpaceTagSchema),
  createdAt: z.string(),
});

const RoutineSettingsSchema = z.object({
  // Assente nei salvataggi precedenti all'opzione nido/asilo.
  school: z.boolean().default(false),
  wakeTime: z.string(),
  breakfastEnd: z.string(),
  morningSnackStart: z.string(),
  morningSnackEnd: z.string(),
  lunchStart: z.string(),
  napStart: z.string(),
  napMinutes: z.number(),
  afternoonSnackEnd: z.string(),
  preDinnerMinutes: z.number(),
  dinnerStart: z.string(),
  bedTime: z.string(),
});

const MealSettingsSchema = z.object({
  lunchMinutes: z.number(),
  dinnerMinutes: z.number(),
  soundsOn: z.boolean(),
  volume: z.number(),
});

const SettingsSchema = z.object({
  routine: RoutineSettingsSchema,
  meals: MealSettingsSchema,
  reducedMotion: z.enum(['system', 'on', 'off']),
});

const PlannedSlotSchema = z.object({
  slotId: SlotIdSchema,
  activityId: z.string(),
  status: SlotStatusSchema,
  swapCount: z.number(),
});

const SpecialDaySchema = z.object({
  kind: z.enum(['mare', 'nonni', 'viaggio', 'altro']),
  label: z.string().optional(),
});

const DayPlanSchema = z.object({
  date: z.string(),
  familyDay: z.boolean(),
  special: SpecialDaySchema.optional(),
  weather: WeatherSchema,
  regenNonce: z.number(),
  slots: z.array(PlannedSlotSchema),
});

const TimerSessionSchema = z.object({
  meal: z.enum(['pranzo', 'cena', 'vestirsi', 'riordino', 'libero']),
  dateISO: z.string(),
  startedAt: z.number(),
  durationMs: z.number(),
  pausedAt: z.number().nullable(),
  pausedTotalMs: z.number(),
  status: z.enum(['running', 'paused', 'celebrating', 'done']),
});

// Partial<Record<BadgeId, string>> — ogni chiave è opzionale
const BadgesSchema = z.object({
  'prima-stella': z.string().optional(),
  'tre-di-fila': z.string().optional(),
  'settimana-arcobaleno': z.string().optional(),
  'mese-magico': z.string().optional(),
  'piccola-artista': z.string().optional(),
  esploratrice: z.string().optional(),
  sirenetta: z.string().optional(),
  ballerina: z.string().optional(),
  'chef-stellata': z.string().optional(),
  scienziata: z.string().optional(),
  campionessa: z.string().optional(),
  attrice: z.string().optional(),
  'buona-forchetta': z.string().optional(),
});

// Record<CategoryId, number> — tutte le 10 categorie obbligatorie
const DoneByCategorySchema = z.object({
  MOT: z.number(), CRE: z.number(), SEN: z.number(), COG: z.number(), MUS: z.number(),
  SIM: z.number(), ACQ: z.number(), NAT: z.number(), CUC: z.number(), CAL: z.number(),
});

const ProgressStateSchema = z.object({
  streak: z.number(),
  lastStreakDate: z.string().nullable(),
  badges: BadgesSchema,
  doneByCategory: DoneByCategorySchema,
  mealTimersCompleted: z.number(),
});

export const EnvelopeSchema: z.ZodType<StorageEnvelope, z.ZodTypeDef, unknown> = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string(),
  profile: ChildProfileSchema.nullable(),
  settings: SettingsSchema,
  plans: z.record(z.string(), DayPlanSchema),
  progress: ProgressStateSchema,
  timer: TimerSessionSchema.nullable(),
});

// ——— Envelope vuota (wizard da fare) ———
export function emptyEnvelope(): StorageEnvelope {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    profile: null,
    settings: DEFAULT_SETTINGS,
    plans: {},
    progress: {
      streak: 0,
      lastStreakDate: null,
      badges: {},
      doneByCategory: {
        MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
      },
      mealTimersCompleted: 0,
    },
    timer: null,
  };
}

// ——— Migrazioni ———
export class MigrationError extends Error {
  kind: 'newer' | 'invalid';

  constructor(kind: 'newer' | 'invalid') {
    super(
      kind === 'newer'
        ? 'Backup creato con una versione più recente'
        : 'Dati non validi o corrotti',
    );
    this.name = 'MigrationError';
    this.kind = kind;
  }
}

/**
 * Applica retro-compatibilità di piccole variazioni note prima della
 * validazione zod: al momento solo `DayPlan.weather` mancante → 'sole'.
 */
function withDefaultWeather(raw: Record<string, unknown>): Record<string, unknown> {
  const plans = raw.plans;
  if (plans === null || typeof plans !== 'object' || Array.isArray(plans)) {
    return raw;
  }
  const normalizedPlans: Record<string, unknown> = {};
  for (const [date, value] of Object.entries(plans as Record<string, unknown>)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !('weather' in (value as Record<string, unknown>))
    ) {
      normalizedPlans[date] = { ...(value as Record<string, unknown>), weather: 'sole' };
    } else {
      normalizedPlans[date] = value;
    }
  }
  return { ...raw, plans: normalizedPlans };
}

export function migrate(raw: unknown): StorageEnvelope {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MigrationError('invalid');
  }
  const record = raw as Record<string, unknown>;
  const schemaVersion = record.schemaVersion;
  if (typeof schemaVersion === 'number' && schemaVersion > 1) {
    throw new MigrationError('newer');
  }
  const normalized = withDefaultWeather(record);
  const result = EnvelopeSchema.safeParse(normalized);
  if (!result.success) {
    throw new MigrationError('invalid');
  }
  return result.data;
}
