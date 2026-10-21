import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeSequenceRound, type SequenceRound } from '../../core/games/sequenceRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: SequenceRound | null): SequenceRound {
  let round = makeSequenceRound(Math.random);
  let attempts = 0;
  while (previous && round.answer === previous.answer && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeSequenceRound(Math.random);
    attempts++;
  }
  return round;
}

/**
 * Gioco "Cosa viene dopo?" (Task 4): stesso pattern a round degli altri —
 * mostra le prime 4 emoji di un pattern ABAB/AABB e chiede quale viene dopo
 * (il 5° elemento, `answer`) tra 2 opzioni.
 */
export function CosaVieneDopo() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<SequenceRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongOption(null);
    setLocked(false);
  }

  function handlePick(option: string) {
    if (locked) return;

    if (option === round.answer) {
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
      title="Cosa viene dopo?"
      prompt="Cosa viene dopo?"
      emoji="🔁"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <div className="flex items-center gap-3 text-5xl" aria-hidden="true">
          {round.shown.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
          <span className="flex h-14 w-14 items-center justify-center rounded-card border-2 border-dashed border-stone text-2xl text-stone">
            ?
          </span>
        </div>

        <p className="text-center font-body text-xl text-deep">Cosa viene dopo?</p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((option) => (
            <motion.button
              key={option}
              type="button"
              disabled={locked}
              aria-label={option}
              onClick={() => handlePick(option)}
              animate={
                wrongOption === option && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongOption === option) setWrongOption(null);
              }}
              className="flex h-20 w-20 min-h-16 min-w-16 items-center justify-center rounded-card bg-card text-4xl shadow-soft disabled:opacity-60"
            >
              {option}
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
