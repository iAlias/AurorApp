import type { ChoiceRound, Rng } from './types';
import { sample } from './shuffle';

export interface ShadowItem {
  id: string;
  emoji: string;
  label: string;
}

/** Sagome riconoscibili anche tutte nere (la UI le annerisce via CSS). */
export const SHADOW_ITEMS: ShadowItem[] = [
  { id: 'elefante', emoji: '🐘', label: 'elefante' },
  { id: 'giraffa', emoji: '🦒', label: 'giraffa' },
  { id: 'tartaruga', emoji: '🐢', label: 'tartaruga' },
  { id: 'lumaca', emoji: '🐌', label: 'lumaca' },
  { id: 'farfalla', emoji: '🦋', label: 'farfalla' },
  { id: 'pesce', emoji: '🐟', label: 'pesce' },
  { id: 'gallo', emoji: '🐓', label: 'gallo' },
  { id: 'coniglio', emoji: '🐇', label: 'coniglio' },
  { id: 'granchio', emoji: '🦀', label: 'granchio' },
  { id: 'polpo', emoji: '🐙', label: 'polpo' },
  { id: 'macchina', emoji: '🚗', label: 'macchina' },
  { id: 'aereo', emoji: '✈️', label: 'aereo' },
  { id: 'palloncino', emoji: '🎈', label: 'palloncino' },
  { id: 'barca', emoji: '⛵', label: 'barca' },
  { id: 'cactus', emoji: '🌵', label: 'cactus' },
  { id: 'chitarra', emoji: '🎸', label: 'chitarra' },
];

/** Round di "Di chi è l'ombra?": 3 sagome colorate distinte, una è la padrona dell'ombra. */
export function makeShadowRound(rng: Rng): ChoiceRound<ShadowItem> {
  const options = sample(SHADOW_ITEMS, 3, rng);
  const target = options[Math.floor(rng() * options.length)];
  return { target, options };
}
