import type { Rng } from './types';
import { sample } from './shuffle';

export interface Bubble {
  id: number;
  /** Centro della bolla, in % dell'area di gioco. */
  x: number;
  y: number;
  /** Diametro in px: mai sotto i 64px (dita di un bimbo di 3 anni). */
  size: number;
  hue: number;
}

const COLS = 3;
const ROWS = 4;

/**
 * Round di "Scoppia le bolle": da 3 a 6 bolle, ognuna in una cella diversa di
 * una griglia 3×4 con un piccolo scarto casuale — sparse ma mai sovrapposte
 * (con l'area larga almeno 360px e alta 400px una cella misura ~120×100px).
 */
export function makeBubbleRound(rng: Rng): Bubble[] {
  const count = 3 + Math.floor(rng() * 4);
  const cells = sample(
    Array.from({ length: COLS * ROWS }, (_, i) => i),
    count,
    rng,
  );
  return cells.map((cell, id) => ({
    id,
    x: ((cell % COLS) + 0.5) * (100 / COLS) + (rng() - 0.5) * 8,
    y: (Math.floor(cell / COLS) + 0.5) * (100 / ROWS) + (rng() - 0.5) * 3,
    size: 64 + Math.floor(rng() * 17),
    hue: Math.floor(rng() * 360),
  }));
}
