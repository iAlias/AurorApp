import { ACTIVITIES, CATALOG_VERSION } from '../../../src/core/catalog/activities';
import { ActivitySchema, validateCatalog } from '../../../src/core/catalog/schema';
import type { CategoryId } from '../../../src/core/catalog/types';

const CATEGORY_IDS: CategoryId[] = ['MOT', 'CRE', 'SEN', 'COG', 'MUS', 'SIM', 'ACQ', 'NAT', 'CUC', 'CAL'];
const ID_RE = /^(MOT|CRE|SEN|COG|MUS|SIM|ACQ|NAT|CUC|CAL)-(0[1-9]|1[0-5])$/;

function byCat(cat: CategoryId) {
  return ACTIVITIES.filter((a) => a.category === cat);
}

test("CATALOG_VERSION è 1.1 (testi adatti a tutto l'anno)", () => {
  expect(CATALOG_VERSION).toBe('1.1');
});

test('150 attività totali', () => {
  expect(ACTIVITIES).toHaveLength(150);
});

test.each(CATEGORY_IDS)('categoria %s ha esattamente 15 attività', (cat) => {
  expect(byCat(cat)).toHaveLength(15);
});

test('ogni attività è conforme allo schema Activity', () => {
  for (const a of ACTIVITIES) {
    const parsed = ActivitySchema.safeParse(a);
    expect(parsed.success).toBe(true);
  }
});

test('tutti gli id sono univoci e conformi al formato', () => {
  const ids = ACTIVITIES.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    expect(id).toMatch(ID_RE);
  }
});

test('ogni attività CAL ha energy bassa e durationMin <= 30', () => {
  for (const a of byCat('CAL')) {
    expect(a.energy).toBe('bassa');
    expect(a.durationMin).toBeLessThanOrEqual(30);
  }
});

test('durationMin <= 60 per ogni attività', () => {
  for (const a of ACTIVITIES) {
    expect(a.durationMin).toBeLessThanOrEqual(60);
  }
});

test('steps ha tra 2 e 4 elementi per ogni attività', () => {
  for (const a of ACTIVITIES) {
    expect(a.steps.length).toBeGreaterThanOrEqual(2);
    expect(a.steps.length).toBeLessThanOrEqual(4);
  }
});

test('interests ha almeno 1 elemento per ogni attività', () => {
  for (const a of ACTIVITIES) {
    expect(a.interests.length).toBeGreaterThanOrEqual(1);
  }
});

test('nessuna attività ha place casa e requiresDry insieme', () => {
  for (const a of ACTIVITIES) {
    expect(!(a.place === 'casa' && a.requiresDry)).toBe(true);
  }
});

test('validateCatalog(ACTIVITIES) non ha errori', () => {
  expect(validateCatalog(ACTIVITIES)).toEqual([]);
});
