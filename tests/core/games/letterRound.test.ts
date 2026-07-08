import { makeLetterRound } from '../../../src/core/games/letterRound';
import { mulberry32 } from '../../../src/core/planner/rng';

const VOWELS = ['A', 'E', 'I', 'O', 'U'];

describe('makeLetterRound', () => {
  test('genera 3 opzioni distinte', () => {
    const round = makeLetterRound(mulberry32(1), VOWELS);
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options).size).toBe(3);
  });

  test('il target è incluso tra le opzioni', () => {
    const round = makeLetterRound(mulberry32(2), VOWELS);
    expect(round.options).toContain(round.target);
  });

  test('usa solo lettere del pool fornito', () => {
    const pool = ['A', 'E', 'M', 'R', 'I'];
    const round = makeLetterRound(mulberry32(5), pool);
    for (const opt of round.options) {
      expect(pool).toContain(opt);
    }
    expect(pool).toContain(round.target);
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeLetterRound(mulberry32(42), VOWELS);
    const b = makeLetterRound(mulberry32(42), VOWELS);
    expect(a).toEqual(b);
  });

  test('funziona con un pool esteso (vocali + lettere del nome)', () => {
    const pool = [...VOWELS, 'M', 'R', 'T'];
    for (let seed = 0; seed < 20; seed++) {
      const round = makeLetterRound(mulberry32(seed), pool);
      expect(round.options).toHaveLength(3);
      expect(new Set(round.options).size).toBe(3);
    }
  });
});
