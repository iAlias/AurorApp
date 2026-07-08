import { makeSizeRound } from '../../../src/core/games/sizeRound';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('makeSizeRound', () => {
  test('genera 3 scale distinte, tutte in [0.5, 1.5]', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeSizeRound(mulberry32(seed));
      expect(round.scales).toHaveLength(3);
      expect(new Set(round.scales).size).toBe(3);
      for (const s of round.scales) {
        expect(s).toBeGreaterThanOrEqual(0.5);
        expect(s).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('emoji proviene dal pool atteso', () => {
    const pool = ['🐘', '🐢', '🌻', '🚗', '🧸', '🦆'];
    const round = makeSizeRound(mulberry32(7));
    expect(pool).toContain(round.emoji);
  });

  test('target è "max" o "min"', () => {
    const round = makeSizeRound(mulberry32(11));
    expect(['max', 'min']).toContain(round.target);
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeSizeRound(mulberry32(99));
    const b = makeSizeRound(mulberry32(99));
    expect(a).toEqual(b);
  });

  test('su molti seed compaiono entrambi i target', () => {
    const targets = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      targets.add(makeSizeRound(mulberry32(seed)).target);
    }
    expect(targets.size).toBe(2);
  });
});
