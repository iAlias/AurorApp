import type { Rng } from './types';
import { shuffle } from './shuffle';

export interface OrderRound {
  emoji: string;
  scales: number[];
}

/** Pool di emoji per "Dal più piccolo al più grande" (§Task 5). */
const ORDER_EMOJIS = ['🐘', '🌳', '🏠', '🐟', '🌸', '🚗'];

/** Fasce disgiunte di [0.5, 1.5]: una scala per fascia garantisce 3 valori
 * sempre distinti senza dover ripescare finché non sono diversi (stesso
 * schema di `sizeRound.ts`). */
const SCALE_BANDS: [number, number][] = [
  [0.5, 0.83],
  [0.84, 1.16],
  [1.17, 1.5],
];

/**
 * Round di "Dal più piccolo al più grande": la stessa emoji ripetuta a 3
 * scale distinte (una per fascia di `SCALE_BANDS`, poi mescolate) — si vince
 * toccando i bottoni in ordine crescente di scala.
 */
export function makeOrderRound(rng: Rng): OrderRound {
  const emoji = ORDER_EMOJIS[Math.floor(rng() * ORDER_EMOJIS.length)];
  const raw = SCALE_BANDS.map(([lo, hi]) => lo + rng() * (hi - lo));
  const scales = shuffle(raw, rng);
  return { emoji, scales };
}
