import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeColorRound, type GameColor } from '../../core/games/colorRound';
import type { ChoiceRound } from '../../core/games/types';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3):
 * abbastanza per vedere la stella accendersi, poco per non far aspettare. */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per evitare che il round successivo ripeta lo stesso
 * target del precedente (anti-ripetizione, §Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: ChoiceRound<GameColor> | null): ChoiceRound<GameColor> {
  let round = makeColorRound(Math.random);
  let attempts = 0;
  while (previous && round.target.id === previous.target.id && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeColorRound(Math.random);
    attempts++;
  }
  return round;
}

/**
 * Gioco "Tocca il colore" (Task 3): 5 round, ogni volta 4 cerchi colorati e
 * un prompt che chiede di toccarne uno. Il pattern (successo→stella+nuovo
 * round dopo ~600ms, errore→wiggle senza suono, si ritenta) è quello di
 * riferimento anche per gli altri giochi a round (Task 3-6).
 */
export function ToccaIlColore() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<ChoiceRound<GameColor>>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongId(null);
    setLocked(false);
  }

  function handlePick(color: GameColor) {
    if (locked) return;

    if (color.id === round.target.id) {
      celebrateRound(soundsOn);
      setWrongId(null);
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

    // Risposta sbagliata: nessun suono, wiggle sull'opzione toccata, si
    // ritenta liberamente — il round non avanza.
    setWrongId(color.id);
  }

  // "il ROSSO" ma "l'ARANCIONE".
  const article = /^[AEIOU]/.test(round.target.label) ? "l'" : 'il ';

  return (
    <GameShell
      title="Tocca il colore"
      prompt={`Tocca ${article}${round.target.label}`}
      emoji="🔴"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">
          Tocca {article}
          <span className="font-display font-bold">{round.target.label}</span>
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((color) => (
            <motion.button
              key={color.id}
              type="button"
              disabled={locked}
              aria-label={color.label}
              onClick={() => handlePick(color)}
              animate={
                wrongId === color.id && !reducedMotion
                  ? { x: [0, -10, 10, -10, 10, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongId === color.id) setWrongId(null);
              }}
              className="h-20 w-20 min-h-16 min-w-16 rounded-full shadow-soft disabled:opacity-60"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
