import type { Rng } from './types';
import { sample, shuffle } from './shuffle';

export interface CountRound {
  count: number;
  emoji: string;
  options: number[];
}

/** Pool di emoji da ripetere per "Conta con me" (§Task 3). */
const COUNT_EMOJIS = ['🍎', '🐟', '🌼', '🎈', '🐤', '⭐', '🍓', '🦋'];

/** Numeri candidati come opzioni sbagliate (1..6, `count` escluso a runtime). */
const NUMBER_POOL = [1, 2, 3, 4, 5, 6];

/**
 * Round di "Conta con me": un numero da 1 a 5 di emoji ripetute da contare,
 * e 3 opzioni numeriche distinte (1..6) tra cui `count` è sempre presente.
 */
export function makeCountRound(rng: Rng): CountRound {
  const count = 1 + Math.floor(rng() * 5); // 1..5
  const emoji = COUNT_EMOJIS[Math.floor(rng() * COUNT_EMOJIS.length)];

  const distractorPool = NUMBER_POOL.filter((n) => n !== count);
  const distractors = sample(distractorPool, 2, rng);
  const options = shuffle([count, ...distractors], rng);

  return { count, emoji, options };
}
