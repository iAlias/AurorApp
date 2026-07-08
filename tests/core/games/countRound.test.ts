import { makeCountRound } from '../../../src/core/games/countRound';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('makeCountRound', () => {
  test('count è sempre tra 1 e 5', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeCountRound(mulberry32(seed));
      expect(round.count).toBeGreaterThanOrEqual(1);
      expect(round.count).toBeLessThanOrEqual(5);
    }
  });

  test('genera 3 opzioni distinte, tutte tra 1 e 6', () => {
    const round = makeCountRound(mulberry32(7));
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options).size).toBe(3);
    for (const opt of round.options) {
      expect(opt).toBeGreaterThanOrEqual(1);
      expect(opt).toBeLessThanOrEqual(6);
    }
  });

  test('count è sempre incluso tra le opzioni', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeCountRound(mulberry32(seed));
      expect(round.options).toContain(round.count);
    }
  });

  test('emoji proviene dal pool atteso', () => {
    const pool = ['🍎', '🐟', '🌼', '🎈', '🐤', '⭐', '🍓', '🦋'];
    const round = makeCountRound(mulberry32(11));
    expect(pool).toContain(round.emoji);
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeCountRound(mulberry32(99));
    const b = makeCountRound(mulberry32(99));
    expect(a).toEqual(b);
  });
});
