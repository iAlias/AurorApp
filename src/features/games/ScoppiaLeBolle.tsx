import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { audioManager } from '../../ui/audio';
import { useReducedMotionPref } from '../../ui/motion';
import { speak } from '../../ui/speech';
import { makeBubbleRound, type Bubble } from '../../core/games/bubbleRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
const NEXT_ROUND_DELAY_MS = 800;

/**
 * Gioco "Scoppia le bolle": a ogni round da 3 a 6 bolle sparse; ogni tocco ne
 * scoppia una e la voce conta ad alta voce ("uno, due, tre…"), così il
 * gesto diventa conteggio. Finite le bolle, festa piccola e round nuovo.
 */
export function ScoppiaLeBolle() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [bubbles, setBubbles] = useState<Bubble[]>(() => makeBubbleRound(Math.random));
  const [popped, setPopped] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);

  function handleRestart() {
    setBubbles(makeBubbleRound(Math.random));
    setPopped(0);
    setCompletedRounds(0);
    setFinished(false);
  }

  function pop(id: number) {
    const left = bubbles.filter((b) => b.id !== id);
    const count = popped + 1;
    setBubbles(left);
    setPopped(count);
    if (soundsOn) {
      audioManager.play('pop');
      speak(String(count));
    }
    if (left.length > 0) return;

    celebrateRound(soundsOn);
    const nextCompleted = completedRounds + 1;
    setTimeout(() => {
      setCompletedRounds(nextCompleted);
      if (nextCompleted >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setBubbles(makeBubbleRound(Math.random));
        setPopped(0);
      }
    }, NEXT_ROUND_DELAY_MS);
  }

  return (
    <GameShell
      title="Scoppia le bolle"
      prompt="Scoppia tutte le bolle!"
      emoji="🫧"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <p className="text-center font-display text-3xl text-deep" aria-live="polite">
        {popped > 0 ? popped : ' '}
      </p>
      <div className="relative h-[400px] w-full overflow-hidden rounded-2xl bg-sky/30" data-testid="bubble-area">
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.button
              key={`${completedRounds}-${b.id}`}
              type="button"
              aria-label="Bolla"
              onPointerDown={() => pop(b.id)}
              initial={{ opacity: 0 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.4 }}
              transition={
                reducedMotion
                  ? { duration: 0.15 }
                  : { opacity: { duration: 0.2 }, y: { duration: 2.4, repeat: Infinity }, scale: { duration: 0.2 } }
              }
              className="absolute rounded-full border-2 border-white/80 shadow-soft"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.size,
                height: b.size,
                marginLeft: -b.size / 2,
                marginTop: -b.size / 2,
                touchAction: 'manipulation',
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), hsla(${b.hue},85%,72%,.75) 45%, hsla(${b.hue},85%,60%,.45))`,
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}
