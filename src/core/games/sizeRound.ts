import type { Rng } from './types';
import { shuffle } from './shuffle';

export interface SizeRound {
  emoji: string;
  scales: number[];
  target: 'max' | 'min';
}

/** Pool di emoji per "Grande e piccolo" (§Task 4). */
const SIZE_EMOJIS = ['🐘', '🐢', '🌻', '🚗', '🧸', '🦆'];

/** Fasce disgiunte di [0.5, 1.5]: una scala per fascia garantisce 3 valori
 * sempre distinti senza dover ripescare finche' non sono diversi. */
const SCALE_BANDS: [number, number][] = [
  [0.5, 0.83],
  [0.84, 1.16],
  [1.17, 1.5],
];

/**
 * Round di "Grande e piccolo": la stessa emoji ripetuta a 3 scale distinte
 * (una per fascia di `SCALE_BANDS`, poi mescolate) e un `target` casuale
 * ("più grande" o "più piccolo" da toccare).
 */
export function makeSizeRound(rng: Rng): SizeRound {
  const emoji = SIZE_EMOJIS[Math.floor(rng() * SIZE_EMOJIS.length)];
  const raw = SCALE_BANDS.map(([lo, hi]) => lo + rng() * (hi - lo));
  const scales = shuffle(raw, rng);
  const target: 'max' | 'min' = rng() < 0.5 ? 'max' : 'min';
  return { emoji, scales, target };
}
