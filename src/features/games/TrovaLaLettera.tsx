import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeLetterRound } from '../../core/games/letterRound';
import type { ChoiceRound } from '../../core/games/types';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

const VOWELS = ['A', 'E', 'I', 'O', 'U'];

/** Pool = vocali + lettere maiuscole distinte del nome della bimba; se il
 * totale scende sotto 3 (nome vuoto o senza lettere A-Z) si usano solo le
 * vocali, che da sole bastano sempre per 3 opzioni distinte (§Task 3). */
function buildLetterPool(name: string): string[] {
  const nameLetters = [...name.toUpperCase()].filter((ch) => /^[A-Z]$/.test(ch));
  const pool = [...new Set([...VOWELS, ...nameLetters])];
  return pool.length >= 3 ? pool : VOWELS;
}

function rollRound(pool: readonly string[], previous: ChoiceRound<string> | null): ChoiceRound<string> {
  let round = makeLetterRound(Math.random, pool);
  let attempts = 0;
  while (previous && round.target === previous.target && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeLetterRound(Math.random, pool);
    attempts++;
  }
  return round;
}

/**
 * Gioco "Trova la lettera" (Task 3): stesso pattern a round degli altri due
 * — il pool di lettere dipende dal profilo (vocali + nome della bimba).
 */
export function TrovaLaLettera() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const childName = useApp((s) => s.profile?.name ?? '');
  const reducedMotion = useReducedMotionPref();

  const pool = useMemo(() => buildLetterPool(childName), [childName]);

  const [round, setRound] = useState<ChoiceRound<string>>(() => rollRound(pool, null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongLetter, setWrongLetter] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(pool, null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongLetter(null);
    setLocked(false);
  }

  function handlePick(letter: string) {
    if (locked) return;

    if (letter === round.target) {
      celebrateRound(soundsOn);
      setWrongLetter(null);
      setLocked(true);
      const nextCompleted = completedRounds + 1;
      setTimeout(() => {
        setCompletedRounds(nextCompleted);
        if (nextCompleted >= TOTAL_ROUNDS) {
          setFinished(true);
        } else {
          setRound((prev) => rollRound(pool, prev));
        }
        setLocked(false);
      }, NEXT_ROUND_DELAY_MS);
      return;
    }

    setWrongLetter(letter);
  }

  return (
    <GameShell
      title="Trova la lettera"
      emoji="🔤"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">
          Trova la <span className="font-display font-bold">{round.target}</span>
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((letter) => (
            <motion.button
              key={letter}
              type="button"
              disabled={locked}
              aria-label={`Lettera ${letter}`}
              onClick={() => handlePick(letter)}
              animate={
                wrongLetter === letter && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongLetter === letter) setWrongLetter(null);
              }}
              className="flex h-20 w-20 min-h-16 min-w-16 items-center justify-center rounded-card bg-card font-display text-4xl font-bold text-deep shadow-soft disabled:opacity-60"
            >
              {letter}
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
