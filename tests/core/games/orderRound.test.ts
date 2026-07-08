import { makeOrderRound } from '../../../src/core/games/orderRound';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('makeOrderRound', () => {
  test('genera 3 scale distinte, tutte in [0.5, 1.5]', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeOrderRound(mulberry32(seed));
      expect(round.scales).toHaveLength(3);
      expect(new Set(round.scales).size).toBe(3);
      for (const s of round.scales) {
        expect(s).toBeGreaterThanOrEqual(0.5);
        expect(s).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('emoji proviene dal pool atteso', () => {
    const pool = ['🐘', '🌳', '🏠', '🐟', '🌸', '🚗'];
    const round = makeOrderRound(mulberry32(7));
    expect(pool).toContain(round.emoji);
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeOrderRound(mulberry32(99));
    const b = makeOrderRound(mulberry32(99));
    expect(a).toEqual(b);
  });

  test('seed diversi ⇒ ordini diversi almeno in un caso (shuffle effettivo)', () => {
    const orders = Array.from({ length: 20 }, (_, seed) =>
      makeOrderRound(mulberry32(seed)).scales.join(','),
    );
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});
