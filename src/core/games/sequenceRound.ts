import type { Rng } from './types';
import { shuffle } from './shuffle';

export interface SequenceRound {
  shown: string[];
  answer: string;
  options: string[];
}

/** Coppie A/B per "Cosa viene dopo?": emoji ben distinguibili (§Task 4). */
const PAIRS: [string, string][] = [
  ['🔴', '🔵'],
  ['🌞', '🌙'],
  ['🐟', '🐙'],
  ['🍓', '🍋'],
  ['💛', '💜'],
];

type Pattern = 'ABAB' | 'AABB';

/** Valore dell'elemento in posizione `i` (0-based) del pattern periodico:
 * ABAB ha periodo 2, AABB periodo 4 — entrambi i periodi dividono 4, quindi
 * la posizione 4 (la "risposta", il 5° elemento) coincide sempre col primo
 * elemento mostrato (`a`), qualunque sia il pattern scelto. */
function patternValue(pattern: Pattern, i: number, a: string, b: string): string {
  if (pattern === 'ABAB') return i % 2 === 0 ? a : b;
  return i % 4 < 2 ? a : b;
}

/**
 * Round di "Cosa viene dopo?": una sequenza di 4 emoji che segue un pattern
 * ABAB o AABB pescato da una coppia A/B; la risposta è la continuazione
 * logica (il 5° elemento), tra 2 opzioni distinte mescolate.
 */
export function makeSequenceRound(rng: Rng): SequenceRound {
  const [p1, p2] = PAIRS[Math.floor(rng() * PAIRS.length)];
  // Scambio casuale di quale dei due emoji della coppia gioca il ruolo di
  // "a" (quello che riappare in posizione 5): varia la risposta corretta tra
  // le due emoji della coppia invece di essere sempre la prima del pool.
  const [a, b] = rng() < 0.5 ? [p1, p2] : [p2, p1];
  const pattern: Pattern = rng() < 0.5 ? 'ABAB' : 'AABB';

  const shown = [0, 1, 2, 3].map((i) => patternValue(pattern, i, a, b));
  const answer = patternValue(pattern, 4, a, b);
  const wrong = answer === a ? b : a;
  const options = shuffle([answer, wrong], rng);

  return { shown, answer, options };
}
