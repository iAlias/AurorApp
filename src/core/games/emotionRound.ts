import type { ChoiceRound, Rng } from './types';
import { sample } from './shuffle';

export interface Emotion {
  id: string;
  emoji: string;
  /** Accordato a "faccia": "Tocca la faccia ARRABBIATA". */
  label: string;
}

export const EMOTIONS: Emotion[] = [
  { id: 'felice', emoji: '😄', label: 'FELICE' },
  { id: 'triste', emoji: '😢', label: 'TRISTE' },
  { id: 'arrabbiata', emoji: '😠', label: 'ARRABBIATA' },
  { id: 'sorpresa', emoji: '😲', label: 'SORPRESA' },
  { id: 'assonnata', emoji: '😴', label: 'ASSONNATA' },
  { id: 'spaventata', emoji: '😨', label: 'SPAVENTATA' },
];

/** Round di "Come si sente?": 3 facce distinte, una è quella richiesta. */
export function makeEmotionRound(rng: Rng): ChoiceRound<Emotion> {
  const options = sample(EMOTIONS, 3, rng);
  const target = options[Math.floor(rng() * options.length)];
  return { target, options };
}
