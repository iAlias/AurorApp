import type { Rng } from './types';

/**
 * Fisher-Yates puro (§determinismo): stesso `rng` ⇒ stesso ordine, sempre.
 * Non muta `items` — lavora su una copia, cosi' l'array originale (spesso un
 * catalogo condiviso) resta intatto per chi altro lo usa.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Estrae `n` elementi distinti (per posizione, non per valore) a caso da
 * `pool` (richiede `n <= pool.length`): mescola l'intero pool e ne prende i
 * primi `n`, cosi' ogni indice compare al massimo una volta.
 */
export function sample<T>(pool: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(pool, rng).slice(0, n);
}
