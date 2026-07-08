import { makeSequenceRound } from '../../../src/core/games/sequenceRound';
import { mulberry32 } from '../../../src/core/planner/rng';

const PAIR_EMOJIS = new Set([
  '🔴', '🔵', '🌞', '🌙', '🐟', '🐙', '🍓', '🍋', '💛', '💜',
]);

describe('makeSequenceRound', () => {
  test('shown ha 4 emoji, tutte dal pool atteso', () => {
    const round = makeSequenceRound(mulberry32(1));
    expect(round.shown).toHaveLength(4);
    for (const e of round.shown) {
      expect(PAIR_EMOJIS.has(e)).toBe(true);
    }
  });

  test('il pattern (ABAB o AABB) è coerente e answer è il 5° elemento corretto', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeSequenceRound(mulberry32(seed));
      const [s0, s1, s2, s3] = round.shown;
      const isABAB = s0 === s2 && s1 === s3 && s0 !== s1;
      const isAABB = s0 === s1 && s2 === s3 && s0 !== s2;
      expect(isABAB || isAABB).toBe(true);
      // Sia ABAB (periodo 2) sia AABB (periodo 4) hanno periodo che divide 4:
      // la posizione 5 (indice 4) coincide sempre col primo elemento mostrato.
      expect(round.answer).toBe(s0);
    }
  });

  test('opzioni distinte, 2 elementi, answer incluso', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeSequenceRound(mulberry32(seed));
      expect(round.options).toHaveLength(2);
      expect(new Set(round.options).size).toBe(2);
      expect(round.options).toContain(round.answer);
    }
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeSequenceRound(mulberry32(42));
    const b = makeSequenceRound(mulberry32(42));
    expect(a).toEqual(b);
  });
});
