import { shuffle, sample } from '../../../src/core/games/shuffle';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('shuffle', () => {
  test('stesso seed produce sempre lo stesso ordine (determinismo)', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const a = shuffle(items, mulberry32(42));
    const b = shuffle(items, mulberry32(42));
    expect(a).toEqual(b);
  });

  test('è una permutazione: stessi elementi, stessa lunghezza', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const result = shuffle(items, mulberry32(7));
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  test('non muta l’array in input', () => {
    const items = ['a', 'b', 'c'];
    const original = [...items];
    shuffle(items, mulberry32(1));
    expect(items).toEqual(original);
  });

  test('semi diversi tendono a produrre ordini diversi', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(items, mulberry32(1));
    const b = shuffle(items, mulberry32(2));
    expect(a).not.toEqual(b);
  });
});

describe('sample', () => {
  test('estrae esattamente n elementi', () => {
    const pool = [1, 2, 3, 4, 5];
    expect(sample(pool, 3, mulberry32(5))).toHaveLength(3);
  });

  test('gli elementi estratti sono senza duplicati e presi dal pool', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const result = sample(pool, 4, mulberry32(9));
    expect(new Set(result).size).toBe(result.length);
    for (const item of result) {
      expect(pool).toContain(item);
    }
  });

  test('n === pool.length ritorna una permutazione completa', () => {
    const pool = [1, 2, 3];
    const result = sample(pool, 3, mulberry32(3));
    expect([...result].sort()).toEqual([...pool].sort());
  });

  test('non muta il pool in input', () => {
    const pool = ['x', 'y', 'z'];
    const original = [...pool];
    sample(pool, 2, mulberry32(11));
    expect(pool).toEqual(original);
  });
});
