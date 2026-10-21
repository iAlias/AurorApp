import type { Rng } from './types';
import { shuffle } from './shuffle';

export type HabitatId = 'mare' | 'fattoria' | 'bosco';

export interface Habitat {
  id: HabitatId;
  emoji: string;
  label: string;
}

export interface HabitatAnimal {
  emoji: string;
  /** Con l'articolo, pronto per la consegna "Dove vive il polpo?". */
  name: string;
  home: HabitatId;
}

export const HABITATS: Habitat[] = [
  { id: 'mare', emoji: '🌊', label: 'MARE' },
  { id: 'fattoria', emoji: '🚜', label: 'FATTORIA' },
  { id: 'bosco', emoji: '🌳', label: 'BOSCO' },
];

/** Solo animali dalla casa inequivocabile per un bimbo (niente anatre o tartarughe). */
export const HABITAT_ANIMALS: HabitatAnimal[] = [
  { emoji: '🐙', name: 'il polpo', home: 'mare' },
  { emoji: '🐬', name: 'il delfino', home: 'mare' },
  { emoji: '🦀', name: 'il granchio', home: 'mare' },
  { emoji: '🐳', name: 'la balena', home: 'mare' },
  { emoji: '🐠', name: 'il pesciolino', home: 'mare' },
  { emoji: '🐄', name: 'la mucca', home: 'fattoria' },
  { emoji: '🐖', name: 'il maiale', home: 'fattoria' },
  { emoji: '🐑', name: 'la pecora', home: 'fattoria' },
  { emoji: '🐓', name: 'il gallo', home: 'fattoria' },
  { emoji: '🐴', name: 'il cavallo', home: 'fattoria' },
  { emoji: '🦊', name: 'la volpe', home: 'bosco' },
  { emoji: '🐻', name: "l'orso", home: 'bosco' },
  { emoji: '🦉', name: 'il gufo', home: 'bosco' },
  { emoji: '🐿️', name: 'lo scoiattolo', home: 'bosco' },
  { emoji: '🦔', name: 'il riccio', home: 'bosco' },
];

export interface HabitatRound {
  animal: HabitatAnimal;
  /** Le 3 case, in ordine mescolato a ogni round. */
  options: Habitat[];
}

/** Round di "Chi vive qui?": un animale e le 3 case tra cui scegliere la sua. */
export function makeHabitatRound(rng: Rng): HabitatRound {
  const animal = HABITAT_ANIMALS[Math.floor(rng() * HABITAT_ANIMALS.length)];
  return { animal, options: shuffle(HABITATS, rng) };
}
