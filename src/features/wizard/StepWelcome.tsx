import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { springSoft, useReducedMotionPref } from '../../ui/motion';

export interface StepWelcomeProps {
  onNext: () => void;
}

/**
 * Step 1/6 — schermata di benvenuto (FR-1): illustrazione animata (spring
 * all'ingresso) + claim + CTA "Iniziamo" che apre lo step 2. Nessuna
 * validazione: si avanza sempre. Con `prefers-reduced-motion` (AC-10 §14),
 * l'ingresso e' un semplice fade: niente scala.
 */
export function StepWelcome({ onNext }: StepWelcomeProps) {
  const reducedMotion = useReducedMotionPref();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={reducedMotion ? { duration: 0.15 } : springSoft}
        className="text-8xl"
        aria-hidden="true"
      >
        🌈
      </motion.div>
      <h1 className="font-display text-3xl text-deep">Ciao! Benvenuti in Arcobimbi</h1>
      <p className="max-w-xs font-body text-lg text-stone">
        Prepariamo insieme giornate piene di gioco, scoperta e sorrisi 💛
      </p>
      <Button type="button" size="xl" onClick={onNext}>
        Iniziamo
      </Button>
    </div>
  );
}
