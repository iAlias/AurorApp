import { useState } from 'react';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { celebrateRound } from './feedback';

/** Pausa dopo una risposta giusta prima del round successivo (stessa dei giochi storici). */
const NEXT_ROUND_DELAY_MS = 600;

/**
 * Ciclo comune dei giochi a scelta "tocca quello giusto" (stesso schema di
 * `ToccaIlColore`): risposta giusta → festa piccola, stella e round nuovo dopo
 * una pausa; sbagliata → l'opzione toccata trema, nessun suono, si ritenta.
 * `roll(prev)` genera il round successivo (e può evitare di ripetere `prev`).
 */
export function useChoiceRounds<R>(roll: (prev: R | null) => R, totalRounds: number) {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<R>(() => roll(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function restart() {
    setRound(roll(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongKey(null);
    setLocked(false);
  }

  function answer(key: string, correct: boolean) {
    if (locked) return;
    if (!correct) {
      setWrongKey(key);
      return;
    }
    celebrateRound(soundsOn);
    setWrongKey(null);
    setLocked(true);
    const nextCompleted = completedRounds + 1;
    setTimeout(() => {
      setCompletedRounds(nextCompleted);
      if (nextCompleted >= totalRounds) setFinished(true);
      else setRound((prev) => roll(prev));
      setLocked(false);
    }, NEXT_ROUND_DELAY_MS);
  }

  /** Props framer-motion per far tremare l'opzione sbagliata (solo `transform`). */
  function wiggle(key: string) {
    return {
      animate: wrongKey === key && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 },
      transition: { duration: 0.4 },
      onAnimationComplete: () => {
        if (wrongKey === key) setWrongKey(null);
      },
    };
  }

  const shell = { totalRounds, completedRounds, finished, onRestart: restart };
  return { round, locked, answer, wiggle, shell };
}
