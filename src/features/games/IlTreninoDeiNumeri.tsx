import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { audioManager } from '../../ui/audio';
import { useReducedMotionPref } from '../../ui/motion';
import { speak } from '../../ui/speech';
import { shuffle } from '../../core/games/shuffle';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

/** Quanti vagoni per round: si parte facili e si arriva al 5. */
const ROUND_SIZES = [3, 3, 4, 4, 5];
const NEXT_ROUND_DELAY_MS = 800;

function numbersUpTo(n: number): number[] {
  return shuffle(
    Array.from({ length: n }, (_, i) => i + 1),
    Math.random,
  );
}

/**
 * Gioco "Il trenino dei numeri": i numeri da 1 a N sono sparsi; toccandoli in
 * ordine si agganciano uno dopo l'altro alla locomotiva e la voce li dice.
 * Il numero sbagliato trema e basta: si riprova senza perdere i vagoni già agganciati.
 */
export function IlTreninoDeiNumeri() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loose, setLoose] = useState<number[]>(() => numbersUpTo(ROUND_SIZES[0]));
  const [hooked, setHooked] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);

  const size = ROUND_SIZES[Math.min(completedRounds, ROUND_SIZES.length - 1)];

  function handleRestart() {
    setCompletedRounds(0);
    setFinished(false);
    setLoose(numbersUpTo(ROUND_SIZES[0]));
    setHooked(0);
    setWrong(null);
  }

  function tap(n: number) {
    if (n !== hooked + 1) {
      setWrong(n);
      return;
    }
    setWrong(null);
    setHooked(n);
    setLoose((prev) => prev.filter((x) => x !== n));
    if (soundsOn) {
      audioManager.play('pop');
      speak(String(n));
    }
    if (n < size) return;

    celebrateRound(soundsOn);
    const nextCompleted = completedRounds + 1;
    setTimeout(() => {
      setCompletedRounds(nextCompleted);
      if (nextCompleted >= ROUND_SIZES.length) {
        setFinished(true);
      } else {
        setLoose(numbersUpTo(ROUND_SIZES[nextCompleted]));
        setHooked(0);
      }
    }, NEXT_ROUND_DELAY_MS);
  }

  return (
    <GameShell
      title="Il trenino dei numeri"
      prompt="Tocca i numeri in ordine, dall'uno!"
      emoji="🚂"
      totalRounds={ROUND_SIZES.length}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-10 py-6">
        <div className="flex items-end gap-1" role="img" aria-label={`${hooked} vagoni su ${size} agganciati`}>
          <span className="text-6xl" aria-hidden="true">
            🚂
          </span>
          {Array.from({ length: size }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={[
                'flex h-12 w-12 items-center justify-center rounded-lg font-display text-2xl font-bold',
                i < hooked ? 'bg-coral text-white' : 'border-2 border-dashed border-deep/30 text-deep/30',
              ].join(' ')}
            >
              {i < hooked ? i + 1 : '?'}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {loose.map((n) => (
            <motion.button
              key={`${completedRounds}-${n}`}
              type="button"
              aria-label={`Numero ${n}`}
              onClick={() => tap(n)}
              animate={wrong === n && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => {
                if (wrong === n) setWrong(null);
              }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-sun font-display text-4xl font-bold text-deep shadow-soft"
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
