import { makeOddOneOutRound } from '../../../src/core/games/oddOneOut';
import { mulberry32 } from '../../../src/core/planner/rng';

const CATEGORIES: string[][] = [
  ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻'],
  ['🍎', '🍌', '🍇', '🍓', '🍊', '🍐'],
  ['🚗', '🚌', '🚒', '🚜', '🚲', '✈️'],
  ['👕', '👗', '🧦', '👟', '🧢', '🧤'],
];

function categoryOf(item: string): number {
  return CATEGORIES.findIndex((cat) => cat.includes(item));
}

describe('makeOddOneOutRound', () => {
  test('genera 4 elementi con oddIndex nel range valido', () => {
    const round = makeOddOneOutRound(mulberry32(1));
    expect(round.items).toHaveLength(4);
    expect(round.oddIndex).toBeGreaterThanOrEqual(0);
    expect(round.oddIndex).toBeLessThanOrEqual(3);
  });

  test("l'intruso è davvero di categoria diversa dagli altri 3, per ogni seed", () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeOddOneOutRound(mulberry32(seed));
      const categories = round.items.map(categoryOf);
      expect(categories.every((c) => c >= 0)).toBe(true);

      const others = categories.filter((_, i) => i !== round.oddIndex);
      expect(others.every((c) => c === others[0])).toBe(true);
      expect(categories[round.oddIndex]).not.toBe(others[0]);
    }
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeOddOneOutRound(mulberry32(42));
    const b = makeOddOneOutRound(mulberry32(42));
    expect(a).toEqual(b);
  });
});
