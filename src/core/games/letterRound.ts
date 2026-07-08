import type { ChoiceRound, Rng } from './types';
import { sample } from './shuffle';

/**
 * Round di "Trova la lettera": 3 lettere distinte prese dal `pool` fornito
 * dal chiamante (vocali + eventuali lettere del nome, §Task 3), una delle
 * quali è il target.
 */
export function makeLetterRound(rng: Rng, pool: readonly string[]): ChoiceRound<string> {
  const options = sample(pool, 3, rng);
  const target = options[Math.floor(rng() * options.length)];
  return { target, options };
}
