import { DEFAULT_SETTINGS } from '../../../src/core/catalog/types';
import type { StorageEnvelope } from '../../../src/core/catalog/types';
import {
  STORAGE_KEY,
  emptyEnvelope,
  migrate,
  MigrationError,
  EnvelopeSchema,
} from '../../../src/core/storage/envelope';

function fullEnvelope(): StorageEnvelope {
  return {
    schemaVersion: 1,
    savedAt: '2026-07-04T10:00:00.000Z',
    profile: {
      id: 'child-1',
      name: 'Aurora',
      avatarId: 'volpina',
      birthdate: '2023-05-10',
      interests: ['animali', 'disegno'],
      spaces: ['casa', 'giardino'],
      vacationStart: '2026-07-01',
      vacationEnd: '2026-08-31',
      createdAt: '2026-07-04T09:00:00.000Z',
    },
    settings: DEFAULT_SETTINGS,
    plans: {
      '2026-07-04': {
        date: '2026-07-04',
        familyDay: false,
        weather: 'sole',
        regenNonce: 0,
        slots: [
          { slotId: 'M1', activityId: 'MOT-01', status: 'planned', swapCount: 0 },
          { slotId: 'M2', activityId: 'CRE-02', status: 'done', swapCount: 1 },
        ],
      },
      '2026-07-05': {
        date: '2026-07-05',
        familyDay: true,
        special: { kind: 'mare', label: 'Gita al mare' },
        weather: 'caldo',
        regenNonce: 2,
        slots: [
          { slotId: 'P1', activityId: 'ACQ-03', status: 'skipped', swapCount: 0 },
        ],
      },
    },
    progress: {
      streak: 3,
      lastStreakDate: '2026-07-03',
      badges: { 'prima-stella': '2026-07-01T08:00:00.000Z' },
      doneByCategory: {
        MOT: 1, CRE: 1, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
      },
      mealTimersCompleted: 2,
    },
    timer: {
      meal: 'pranzo',
      dateISO: '2026-07-04',
      startedAt: 1751619600000,
      durationMs: 3600000,
      pausedAt: null,
      pausedTotalMs: 0,
      status: 'running',
    },
  };
}

test('STORAGE_KEY: chiave localStorage esatta', () => {
  expect(STORAGE_KEY).toBe('aurorapp.state.v1');
});

test('emptyEnvelope: schemaVersion 1, profilo null, settings default', () => {
  const env = emptyEnvelope();
  expect(env.schemaVersion).toBe(1);
  expect(env.profile).toBeNull();
  expect(env.settings).toEqual(DEFAULT_SETTINGS);
  expect(env.plans).toEqual({});
  expect(env.timer).toBeNull();
  expect(env.progress).toEqual({
    streak: 0,
    lastStreakDate: null,
    badges: {},
    doneByCategory: {
      MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
    },
    mealTimersCompleted: 0,
  });
  expect(typeof env.savedAt).toBe('string');
  expect(() => new Date(env.savedAt).toISOString()).not.toThrow();
});

test('EnvelopeSchema: valida una envelope vuota', () => {
  const result = EnvelopeSchema.safeParse(emptyEnvelope());
  expect(result.success).toBe(true);
});

test('EnvelopeSchema: valida una envelope completa con piani, timer e progressi', () => {
  const env = fullEnvelope();
  const result = EnvelopeSchema.safeParse(env);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toEqual(env);
  }
});

test('EnvelopeSchema: rifiuta un envelope con campo obbligatorio mancante', () => {
  const env = fullEnvelope();
  const broken = { ...env } as Partial<StorageEnvelope>;
  delete broken.settings;
  const result = EnvelopeSchema.safeParse(broken);
  expect(result.success).toBe(false);
});

test('EnvelopeSchema: rifiuta schemaVersion diverso da 1', () => {
  const env = { ...fullEnvelope(), schemaVersion: 2 };
  const result = EnvelopeSchema.safeParse(env);
  expect(result.success).toBe(false);
});

test('EnvelopeSchema: rifiuta uno slot con status non valido', () => {
  const env = fullEnvelope();
  const broken = {
    ...env,
    plans: {
      '2026-07-04': {
        ...env.plans['2026-07-04'],
        slots: [{ slotId: 'M1', activityId: 'MOT-01', status: 'boh', swapCount: 0 }],
      },
    },
  };
  const result = EnvelopeSchema.safeParse(broken);
  expect(result.success).toBe(false);
});

test('EnvelopeSchema: timer.meal accetta i 5 preset (pranzo/cena/vestirsi/riordino/libero)', () => {
  const env = fullEnvelope();
  for (const meal of ['pranzo', 'cena', 'vestirsi', 'riordino', 'libero'] as const) {
    const withMeal = { ...env, timer: { ...env.timer!, meal } };
    const result = EnvelopeSchema.safeParse(withMeal);
    expect(result.success).toBe(true);
  }
});

test('EnvelopeSchema: rifiuta un timer.meal inventato ("merenda")', () => {
  const env = fullEnvelope();
  const broken = { ...env, timer: { ...env.timer!, meal: 'merenda' } };
  const result = EnvelopeSchema.safeParse(broken);
  expect(result.success).toBe(false);
});

test('migrate: schemaVersion 1 passa e restituisce la stessa envelope', () => {
  const env = fullEnvelope();
  expect(migrate(env)).toEqual(env);
});

test('migrate: oggetto alieno → MigrationError invalid', () => {
  expect(() => migrate({ foo: 'bar' })).toThrow(MigrationError);
  try {
    migrate({ foo: 'bar' });
    throw new Error('doveva lanciare');
  } catch (e) {
    expect(e).toBeInstanceOf(MigrationError);
    expect((e as MigrationError).kind).toBe('invalid');
  }
});

test('migrate: input non oggetto (null, numero, array) → invalid', () => {
  for (const raw of [null, 42, [], 'stringa']) {
    expect(() => migrate(raw)).toThrow(MigrationError);
  }
});

test('migrate: schemaVersion 99 → MigrationError newer', () => {
  const env = { ...fullEnvelope(), schemaVersion: 99 };
  try {
    migrate(env);
    throw new Error('doveva lanciare');
  } catch (e) {
    expect(e).toBeInstanceOf(MigrationError);
    expect((e as MigrationError).kind).toBe('newer');
  }
});

test('migrate: DayPlan senza campo weather → default "sole"', () => {
  const env = fullEnvelope();
  const raw = JSON.parse(JSON.stringify(env));
  delete raw.plans['2026-07-04'].weather;
  const migrated = migrate(raw);
  expect(migrated.plans['2026-07-04'].weather).toBe('sole');
  // gli altri piani restano inalterati
  expect(migrated.plans['2026-07-05'].weather).toBe('caldo');
});

test('MigrationError: kind e message per "newer" e "invalid"', () => {
  const newer = new MigrationError('newer');
  expect(newer.kind).toBe('newer');
  expect(newer).toBeInstanceOf(Error);
  expect(newer.message.length).toBeGreaterThan(0);

  const invalid = new MigrationError('invalid');
  expect(invalid.kind).toBe('invalid');
  expect(invalid.message.length).toBeGreaterThan(0);
});
