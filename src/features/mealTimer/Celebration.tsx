import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { Button } from '../../ui/Button';
import { audioManager } from '../../ui/audio';
import { burst } from '../../ui/confetti';
import { useReducedMotionPref } from '../../ui/motion';
import type { TimerSession } from '../../core/catalog/types';
import { TIMER_KINDS } from './timerKinds';
import { usePersonalize } from '../../app/usePersonalize';

export interface CelebrationProps {
  session: TimerSession;
  onDone: () => void;
}

/**
 * Schermata finale del timer pasto (FR-6): coriandoli grandi + suono di
 * festa, UNA sola volta all'ingresso in questa schermata (guardia via ref,
 * non ri-scatta a ogni render), scritta grande col nome del bambino, e il
 * bottone che chiude la sessione (`CELEBRATION_DONE`) e torna a "Oggi".
 */
export function Celebration({ session, onDone }: CelebrationProps) {
  const profileName = useApp((s) => s.profile?.name ?? '');
  const timerDispatch = useApp((s) => s.timerDispatch);
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();
  const g = usePersonalize();
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    burst({ big: true });
    if (soundsOn) audioManager.play('party');
  }, [soundsOn]);

  function handleDone() {
    timerDispatch({ type: 'CELEBRATION_DONE' });
    onDone();
  }

  const mealLabel = g(TIMER_KINDS[session.meal].celebration);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-8 bg-gradient-to-b from-cream to-sun/30 px-6 py-10 text-center lg:min-h-screen">
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.5 }}
        className="text-7xl"
        aria-hidden="true"
      >
        🌈☀️
      </motion.div>

      <h1 className="font-display text-4xl text-deep">{g(`Bravissim{a|o}, ${profileName}! 🎉`)}</h1>
      <p className="font-body text-lg text-stone">{mealLabel}</p>

      <Button type="button" size="xl" onClick={handleDone}>
        Abbiamo finito!
      </Button>
    </div>
  );
}
