import type { Rng } from './types';
import { sample, shuffle } from './shuffle';

export interface OddOneOutRound {
  items: string[];
  oddIndex: number;
}

/** Categorie (>=5 emoji l'una, §Task 4): l'intruso viene sempre pescato da
 * una categoria diversa da quella degli altri 3, cosi' la classificazione ha
 * sempre un criterio netto (nessuna emoji condivisa tra le categorie). */
const CATEGORIES: string[][] = [
  ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻'], // animali
  ['🍎', '🍌', '🍇', '🍓', '🍊', '🍐'], // frutta
  ['🚗', '🚌', '🚒', '🚜', '🚲', '✈️'], // veicoli
  ['👕', '👗', '🧦', '👟', '🧢', '🧤'], // vestiti
];

/**
 * Round di "Trova l'intruso": 3 emoji da una categoria + 1 emoji da un'altra
 * categoria (l'intruso), posizione mescolata tra le 4.
 */
export function makeOddOneOutRound(rng: Rng): OddOneOutRound {
  const [mainCatIdx, oddCatIdx] = sample(
    CATEGORIES.map((_, i) => i),
    2,
    rng,
  );
  const mainItems = sample(CATEGORIES[mainCatIdx], 3, rng);
  const [oddItem] = sample(CATEGORIES[oddCatIdx], 1, rng);

  const positions = shuffle([0, 1, 2, 3], rng);
  const items: string[] = [];
  items[positions[0]] = mainItems[0];
  items[positions[1]] = mainItems[1];
  items[positions[2]] = mainItems[2];
  items[positions[3]] = oddItem;

  return { items, oddIndex: positions[3] };
}
