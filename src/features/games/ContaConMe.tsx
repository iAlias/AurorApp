import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeCountRound, type CountRound } from '../../core/games/countRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: CountRound | null): CountRound {
  let round = makeCountRound(Math.random);
  let attempts = 0;
  while (previous && round.count === previous.count && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeCountRound(Math.random);
    attempts++;
  }
  return round;
}

/**
 * Gioco "Conta con me" (Task 3): stesso pattern a round di "Tocca il
 * colore" — qui il target da toccare è il numero corretto di emoji mostrate.
 */
export function ContaConMe() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<CountRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongOption, setWrongOption] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongOption(null);
    setLocked(false);
  }

  function handlePick(option: number) {
    if (locked) return;

    if (option === round.count) {
      celebrateRound(soundsOn);
      setWrongOption(null);
      setLocked(true);
      const nextCompleted = completedRounds + 1;
      setTimeout(() => {
        setCompletedRounds(nextCompleted);
        if (nextCompleted >= TOTAL_ROUNDS) {
          setFinished(true);
        } else {
          setRound((prev) => rollRound(prev));
        }
        setLocked(false);
      }, NEXT_ROUND_DELAY_MS);
      return;
    }

    setWrongOption(option);
  }

  return (
    <GameShell
      title="Conta con me"
      prompt="Quanti sono?"
      emoji="🔢"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <div
          className="flex flex-wrap justify-center gap-2 text-5xl"
          aria-hidden="true"
        >
          {Array.from({ length: round.count }, (_, i) => (
            <span key={i}>{round.emoji}</span>
          ))}
        </div>

        <p className="text-center font-body text-xl text-deep">Quanti sono?</p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((option) => (
            <motion.button
              key={option}
              type="button"
              disabled={locked}
              aria-label={`${option}`}
              onClick={() => handlePick(option)}
              animate={
                wrongOption === option && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongOption === option) setWrongOption(null);
              }}
              className="flex h-20 w-20 min-h-16 min-w-16 items-center justify-center rounded-card bg-card font-display text-4xl font-bold text-deep shadow-soft disabled:opacity-60"
            >
              {option}
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
