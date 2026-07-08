import type { Rng } from './types';
import { sample } from './shuffle';
import { GAME_COLORS } from './colorRound';

/** Le 6 forme disegnate in SVG inline dal componente "Le forme giuste"
 * (nessun asset, §Task 4). */
export type ShapeId = 'cerchio' | 'quadrato' | 'triangolo' | 'stella' | 'cuore' | 'rombo';

const SHAPES: ShapeId[] = ['cerchio', 'quadrato', 'triangolo', 'stella', 'cuore', 'rombo'];

/** Etichette maiuscole per il prompt "Trova il ___" (§Task 4). */
export const SHAPE_LABELS: Record<ShapeId, string> = {
  cerchio: 'CERCHIO',
  quadrato: 'QUADRATO',
  triangolo: 'TRIANGOLO',
  stella: 'STELLA',
  cuore: 'CUORE',
  rombo: 'ROMBO',
};

export interface ShapeOption {
  shape: ShapeId;
  colorHex: string;
}

export interface ShapeRound {
  target: ShapeId;
  options: ShapeOption[];
}

/**
 * Round di "Le forme giuste": 3 forme distinte, una delle quali è il target;
 * ogni opzione riceve un colore a caso dal pool di "Tocca il colore"
 * (`GAME_COLORS`), scelto indipendentemente dalla forma — cosi' il colore
 * non aiuta a indovinare, il riconoscimento deve avvenire per forma.
 */
export function makeShapeRound(rng: Rng): ShapeRound {
  const shapes = sample(SHAPES, 3, rng);
  const target = shapes[Math.floor(rng() * shapes.length)];
  const options: ShapeOption[] = shapes.map((shape) => ({
    shape,
    colorHex: GAME_COLORS[Math.floor(rng() * GAME_COLORS.length)].hex,
  }));
  return { target, options };
}
