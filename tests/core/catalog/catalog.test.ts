import { ACTIVITIES, CATALOG_VERSION } from '../../../src/core/catalog/activities';
import { ActivitySchema } from '../../../src/core/catalog/schema';
import type { CategoryId } from '../../../src/core/catalog/types';

// Commit 1/2: solo MOT/CRE/SEN/COG/MUS sono trascritte finora (75/150).
// SIM/ACQ/NAT/CUC/CAL arrivano nel commit 2/2, insieme alle asserzioni
// sul catalogo completo (150 totali, validateCatalog, invariante CAL).
const DONE_CATEGORIES: CategoryId[] = ['MOT', 'CRE', 'SEN', 'COG', 'MUS'];
const ID_RE = /^(MOT|CRE|SEN|COG|MUS|SIM|ACQ|NAT|CUC|CAL)-(0[1-9]|1[0-5])$/;

function byCat(cat: CategoryId) {
  return ACTIVITIES.filter((a) => a.category === cat);
}

test('CATALOG_VERSION è 1.0', () => {
  expect(CATALOG_VERSION).toBe('1.0');
});

test.each(DONE_CATEGORIES)('categoria %s ha esattamente 15 attività', (cat) => {
  expect(byCat(cat)).toHaveLength(15);
});

test('ogni attività trascritta è conforme allo schema Activity', () => {
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
