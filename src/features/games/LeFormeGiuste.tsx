import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import {
  makeShapeRound,
  SHAPE_ARTICLES,
  SHAPE_LABELS,
  type ShapeId,
  type ShapeRound,
} from '../../core/games/shapeRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo una risposta giusta prima del round successivo (§Task 3). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

/** Colore fisso della forma target in alto (§Task 4): i colori delle
 * opzioni sotto variano apposta, il riconoscimento è per forma. */
const TARGET_COLOR = '#5E7CE2';

function rollRound(previous: ShapeRound | null): ShapeRound {
  let round = makeShapeRound(Math.random);
  let attempts = 0;
  while (previous && round.target === previous.target && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeShapeRound(Math.random);
    attempts++;
  }
  return round;
}

/** Disegna una delle 6 forme in SVG inline (§Task 4, nessun asset), in un
 * riquadro 0..100 scalato a `size` px. */
function ShapeIcon({ shape, color, size }: { shape: ShapeId; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {shape === 'cerchio' && <circle cx="50" cy="50" r="45" fill={color} />}
      {shape === 'quadrato' && <rect x="10" y="10" width="80" height="80" rx="8" fill={color} />}
      {shape === 'triangolo' && <polygon points="50,8 92,90 8,90" fill={color} />}
      {shape === 'stella' && (
        <path d="M50 5 L61 35 L95 35 L67 55 L78 90 L50 70 L22 90 L33 55 L5 35 L39 35 Z" fill={color} />
      )}
      {shape === 'cuore' && (
        <path
          d="M50 88 C20 62 5 42 5 26 C5 11 18 2 33 6 C43 9 50 20 50 20 C50 20 57 9 67 6 C82 2 95 11 95 26 C95 42 80 62 50 88 Z"
          fill={color}
        />
      )}
      {shape === 'rombo' && <polygon points="50,5 95,50 50,95 5,50" fill={color} />}
    </svg>
  );
}

/**
 * Gioco "Le forme giuste" (Task 4): stesso pattern a round di "Tocca il
 * colore" — qui il target da riconoscere è una forma (SVG inline), non un
 * colore; le opzioni hanno colori mescolati apposta per non aiutare.
 */
export function LeFormeGiuste() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<ShapeRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongShape, setWrongShape] = useState<ShapeId | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setWrongShape(null);
    setLocked(false);
  }

  function handlePick(shape: ShapeId) {
    if (locked) return;

    if (shape === round.target) {
      celebrateRound(soundsOn);
      setWrongShape(null);
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
    setWrongShape(shape);
  }

  return (
    <GameShell
      title="Le forme giuste"
      prompt={`Trova ${SHAPE_ARTICLES[round.target]} ${SHAPE_LABELS[round.target]}`}
      emoji="🔷"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-6 py-6">
        <ShapeIcon shape={round.target} color={TARGET_COLOR} size={120} />
        <p className="text-center font-body text-xl text-deep">
          Trova {SHAPE_ARTICLES[round.target]}{' '}
          <span className="font-display font-bold">{SHAPE_LABELS[round.target]}</span>
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((option) => (
            <motion.button
              key={option.shape}
              type="button"
              disabled={locked}
              aria-label={SHAPE_LABELS[option.shape]}
              onClick={() => handlePick(option.shape)}
              animate={
                wrongShape === option.shape && !reducedMotion
                  ? { x: [0, -10, 10, -10, 10, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrongShape === option.shape) setWrongShape(null);
              }}
              className="flex h-24 w-24 min-h-16 min-w-16 items-center justify-center rounded-card bg-card shadow-soft disabled:opacity-60"
            >
              <ShapeIcon shape={option.shape} color={option.colorHex} size={90} />
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
