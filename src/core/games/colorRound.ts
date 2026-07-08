import type { ChoiceRound, Rng } from './types';
import { sample } from './shuffle';

export interface GameColor {
  id: string;
  label: string;
  hex: string;
}

/** Pool di colori del gioco "Tocca il colore" (nome + esadecimale, §Task 3). */
export const GAME_COLORS: GameColor[] = [
  { id: 'rosso', label: 'ROSSO', hex: '#FF5D5D' },
  { id: 'blu', label: 'BLU', hex: '#5E7CE2' },
  { id: 'giallo', label: 'GIALLO', hex: '#FFD166' },
  { id: 'verde', label: 'VERDE', hex: '#7BC950' },
  { id: 'arancione', label: 'ARANCIONE', hex: '#FF9A3D' },
  { id: 'viola', label: 'VIOLA', hex: '#9B5DE5' },
  { id: 'rosa', label: 'ROSA', hex: '#F49FBC' },
  { id: 'marrone', label: 'MARRONE', hex: '#8B5E3C' },
];

/**
 * Round di "Tocca il colore": 4 cerchi colorati distinti, uno dei quali è il
 * target da toccare. `sample` mescola l'intero pool con lo stesso `rng` cosi'
 * la posizione del target tra le 4 opzioni resta imprevedibile.
 */
export function makeColorRound(rng: Rng): ChoiceRound<GameColor> {
  const options = sample(GAME_COLORS, 4, rng);
  const target = options[Math.floor(rng() * options.length)];
  return { target, options };
}
