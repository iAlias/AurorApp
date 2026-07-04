import { DEFAULT_SETTINGS, ALL_INTERESTS, CATEGORIES } from '../../../src/core/catalog/types';

test('routine default conforme a FR-2', () => {
  const r = DEFAULT_SETTINGS.routine;
  expect(r.wakeTime).toBe('09:00');
  expect(r.breakfastEnd).toBe('09:45');
  expect(r.morningSnackStart).toBe('11:00');
  expect(r.morningSnackEnd).toBe('11:20');
  expect(r.lunchStart).toBe('13:00');
  expect(r.napStart).toBe('14:00');
  expect(r.napMinutes).toBe(120);
  expect(r.afternoonSnackEnd).toBe('16:30');
  expect(r.preDinnerMinutes).toBe(30);
  expect(r.dinnerStart).toBe('19:30');
  expect(r.bedTime).toBe('21:00');
});

test('pasti default 60 minuti, suoni attivi', () => {
  expect(DEFAULT_SETTINGS.meals).toEqual({
    lunchMinutes: 60, dinnerMinutes: 60, soundsOn: true, volume: 0.8,
  });
  expect(DEFAULT_SETTINGS.reducedMotion).toBe('system');
});

test('10 interessi e 10 categorie', () => {
  expect(ALL_INTERESTS).toHaveLength(10);
  expect(Object.keys(CATEGORIES)).toEqual(
    ['MOT','CRE','SEN','COG','MUS','SIM','ACQ','NAT','CUC','CAL'],
  );
});
