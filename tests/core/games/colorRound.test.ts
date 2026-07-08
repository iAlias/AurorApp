import { makeColorRound, GAME_COLORS } from '../../../src/core/games/colorRound';
import { mulberry32 } from '../../../src/core/planner/rng';

describe('makeColorRound', () => {
  test('genera 4 opzioni distinte', () => {
    const round = makeColorRound(mulberry32(1));
    expect(round.options).toHaveLength(4);
    expect(new Set(round.options.map((c) => c.id)).size).toBe(4);
  });

  test('il target è incluso tra le opzioni', () => {
    const round = makeColorRound(mulberry32(2));
    expect(round.options.some((c) => c.id === round.target.id)).toBe(true);
  });

  test('tutte le opzioni provengono dal pool GAME_COLORS', () => {
    const round = makeColorRound(mulberry32(3));
    const poolIds = new Set(GAME_COLORS.map((c) => c.id));
    for (const opt of round.options) {
      expect(poolIds.has(opt.id)).toBe(true);
    }
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeColorRound(mulberry32(42));
    const b = makeColorRound(mulberry32(42));
    expect(a).toEqual(b);
  });

  test('GAME_COLORS ha almeno 8 colori distinti con hex validi', () => {
    expect(GAME_COLORS.length).toBeGreaterThanOrEqual(8);
    for (const c of GAME_COLORS) {
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
