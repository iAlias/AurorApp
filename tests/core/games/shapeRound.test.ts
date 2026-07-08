import { makeShapeRound, SHAPE_LABELS } from '../../../src/core/games/shapeRound';
import { mulberry32 } from '../../../src/core/planner/rng';

const VALID_SHAPES = ['cerchio', 'quadrato', 'triangolo', 'stella', 'cuore', 'rombo'];

describe('makeShapeRound', () => {
  test('genera 3 opzioni con forme distinte', () => {
    const round = makeShapeRound(mulberry32(1));
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options.map((o) => o.shape)).size).toBe(3);
  });

  test('il target è incluso tra le forme delle opzioni', () => {
    const round = makeShapeRound(mulberry32(2));
    expect(round.options.some((o) => o.shape === round.target)).toBe(true);
  });

  test('ogni opzione ha un colore esadecimale valido', () => {
    const round = makeShapeRound(mulberry32(3));
    for (const opt of round.options) {
      expect(opt.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('stesso seed ⇒ stesso round (determinismo)', () => {
    const a = makeShapeRound(mulberry32(42));
    const b = makeShapeRound(mulberry32(42));
    expect(a).toEqual(b);
  });

  test('SHAPE_LABELS copre tutte le 6 forme con etichette non vuote', () => {
    for (const shape of VALID_SHAPES) {
      expect(SHAPE_LABELS[shape as keyof typeof SHAPE_LABELS].length).toBeGreaterThan(0);
    }
  });

  test('su molti seed le forme restano sempre distinte e valide, target incluso', () => {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeShapeRound(mulberry32(seed));
      const shapes = round.options.map((o) => o.shape);
      expect(new Set(shapes).size).toBe(3);
      for (const s of shapes) {
        expect(VALID_SHAPES).toContain(s);
      }
      expect(shapes).toContain(round.target);
    }
  });
});
