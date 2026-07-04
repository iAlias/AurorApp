import type { StorageEnvelope } from '../../../src/core/catalog/types';
import { DEFAULT_SETTINGS } from '../../../src/core/catalog/types';
import { exportJson, parseBackup, backupFilename } from '../../../src/core/storage/exportImport';

function envelopeWithTwoPlans(): StorageEnvelope {
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
        ],
      },
      '2026-07-05': {
        date: '2026-07-05',
        familyDay: true,
        special: { kind: 'mare', label: 'Gita al mare' },
        weather: 'caldo',
        regenNonce: 1,
        slots: [
          { slotId: 'P1', activityId: 'ACQ-03', status: 'done', swapCount: 2 },
        ],
      },
    },
    progress: {
      streak: 2,
      lastStreakDate: '2026-07-03',
      badges: { 'prima-stella': '2026-07-01T08:00:00.000Z' },
      doneByCategory: {
        MOT: 1, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 1, NAT: 0, CUC: 0, CAL: 0,
      },
      mealTimersCompleted: 1,
    },
    timer: null,
  };
}

test('exportJson: produce JSON leggibile (indentato) fedele all\'envelope', () => {
  const env = envelopeWithTwoPlans();
  const json = exportJson(env);
  expect(json).toContain('\n');
  expect(JSON.parse(json)).toEqual(env);
});

test('round-trip: exportJson → parseBackup identico (deep equal)', () => {
  const env = envelopeWithTwoPlans();
  const json = exportJson(env);
  const result = parseBackup(json);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.env).toEqual(env);
  }
});

test('parseBackup: JSON rotto → invalid', () => {
  const result = parseBackup('{{{ non è json');
  expect(result).toEqual({ ok: false, reason: 'invalid' });
});

test('parseBackup: schemaVersion 99 → newer', () => {
  const env = { ...envelopeWithTwoPlans(), schemaVersion: 99 };
  const result = parseBackup(JSON.stringify(env));
  expect(result).toEqual({ ok: false, reason: 'newer' });
});

test('parseBackup: oggetto valido ma con campo obbligatorio mancante → invalid', () => {
  const result = parseBackup(JSON.stringify({ schemaVersion: 1, profile: null }));
  expect(result).toEqual({ ok: false, reason: 'invalid' });
});

test('backupFilename(new Date(2026,6,4)) → aurorapp-backup-2026-07-04.json', () => {
  expect(backupFilename(new Date(2026, 6, 4))).toBe('aurorapp-backup-2026-07-04.json');
});

test('backupFilename: mese e giorno a due cifre con zero iniziale', () => {
  expect(backupFilename(new Date(2026, 0, 5))).toBe('aurorapp-backup-2026-01-05.json');
});
