import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeOddOneOutRound, type OddOneOutRound } from '../../core/games/oddOneOut';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: OddOneOutRound | null): OddOneOutRound {
  let round = makeOddOneOutRound(Math.random);
  let attempts = 0;
  while (
    previous &&
    round.items[round.oddIndex] === previous.items[previous.oddIndex] &&
    attempts < MAX_REROLL_ATTEMPTS
  ) {
    round = makeOddOneOutRound(Math.random);
    attempts++;
  }
  return round;
}

/**
 * Gioco "Trova l'intruso" (Task 4): stesso pattern a round degli altri —
 * griglia 2x2 di emoji, una delle quali (`oddIndex`) è di categoria diversa
 * dalle altre 3.
 */
export function TrovaLIntruso() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<OddOneOutRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongIndex(null);
    setLocked(false);
  }

  function handlePick(index: number) {
    if (locked) return;

    if (index === round.oddIndex) {
      celebrateRound(soundsOn);
      setWrongIndex(null);
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

    setWrongIndex(index);
  }

  return (
    <GameShell
      title="Trova l'intruso"
      prompt="Chi non c'entra?"
      emoji="🕵️"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">Chi non c&apos;entra?</p>

        <div className="grid grid-cols-2 gap-6">
          {round.items.map((item, index) => (
            <motion.button
              key={index}
              type="button"
              disabled={locked}
              aria-label={item}
              onClick={() => handlePick(index)}
              animate={
                wrongIndex === index && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongIndex === index) setWrongIndex(null);
              }}
              className="flex h-24 w-24 min-h-16 min-w-16 items-center justify-center rounded-card bg-card text-5xl shadow-soft disabled:opacity-60"
            >
              {item}
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
