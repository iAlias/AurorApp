import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeSizeRound, type SizeRound } from '../../core/games/sizeRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: SizeRound | null): SizeRound {
  let round = makeSizeRound(Math.random);
  let attempts = 0;
  while (previous && round.emoji === previous.emoji && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeSizeRound(Math.random);
    attempts++;
  }
  return round;
}

/** Rango di una scala tra le tre del round: usato sia per l'`aria-label`
 * ("piccolo"/"medio"/"grande") sia — nel componente — per riconoscere quale
 * bottone corrisponde al `target` ("max"/"min"). */
function rankLabel(scale: number, scales: number[]): 'piccolo' | 'medio' | 'grande' {
  const sorted = [...scales].sort((a, b) => a - b);
  if (scale === sorted[0]) return 'piccolo';
  if (scale === sorted[2]) return 'grande';
  return 'medio';
}

/**
 * Gioco "Grande e piccolo" (Task 4): stesso pattern a round degli altri —
 * qui 3 bottoni con la stessa emoji a scale diverse, tocca la più grande o
 * la più piccola secondo il prompt.
 */
export function GrandeEPiccolo() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<SizeRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongScale, setWrongScale] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const targetScale = round.target === 'max' ? Math.max(...round.scales) : Math.min(...round.scales);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongScale(null);
    setLocked(false);
  }

  function handlePick(scale: number) {
    if (locked) return;

    if (scale === targetScale) {
      celebrateRound(soundsOn);
      setWrongScale(null);
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

    setWrongScale(scale);
  }

  return (
    <GameShell
      title="Grande e piccolo"
      emoji="🐘"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">
          Tocca il più{' '}
          <span className="font-display font-bold">{round.target === 'max' ? 'GRANDE' : 'PICCOLO'}</span>
        </p>

        <div className="flex flex-wrap items-end justify-center gap-6">
          {round.scales.map((scale, i) => (
            <motion.button
              key={i}
              type="button"
              disabled={locked}
              aria-label={rankLabel(scale, round.scales)}
              onClick={() => handlePick(scale)}
              animate={
                wrongScale === scale && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongScale === scale) setWrongScale(null);
              }}
              className="flex min-h-16 min-w-16 items-center justify-center disabled:opacity-60"
            >
              <span style={{ fontSize: 64 * scale }}>{round.emoji}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
