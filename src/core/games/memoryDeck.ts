import type { Rng } from './types';
import { sample, shuffle } from './shuffle';

/** Carta del mazzo di "Memoria degli animali": `id` 0..5 e' stabile e serve
 * solo da chiave React per la posizione — non identifica il valore (due
 * carte della stessa coppia hanno `emoji` uguale ma `id` diversi). */
export interface MemoryCard {
  id: number;
  emoji: string;
}

/** Pool di animali per "Memoria degli animali" (§Task 5). */
const ANIMAL_EMOJIS = ['🐶', '🐱', '🐰', '🦁', '🐸', '🐷', '🐤', '🐠', '🦋', '🐢'];

/**
 * Mazzo di "Memoria degli animali": 3 animali estratti a caso dal pool,
 * duplicati in coppie (6 carte totali) e mescolati.
 */
export function makeMemoryDeck(rng: Rng): MemoryCard[] {
  const animals = sample(ANIMAL_EMOJIS, 3, rng);
  const pairs = shuffle([...animals, ...animals], rng);
  return pairs.map((emoji, id) => ({ id, emoji }));
}
