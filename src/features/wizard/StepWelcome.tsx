import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { springSoft } from '../../ui/motion';

export interface StepWelcomeProps {
  onNext: () => void;
}

/**
 * Step 1/6 — schermata di benvenuto (FR-1): illustrazione animata (spring
 * all'ingresso) + claim + CTA "Iniziamo" che apre lo step 2. Nessuna
 * validazione: si avanza sempre.
 */
export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springSoft}
        className="text-8xl"
        aria-hidden="true"
      >
        🌈
      </motion.div>
      <h1 className="font-display text-3xl text-deep">Ciao! Benvenuta in AurorApp</h1>
      <p className="max-w-xs font-body text-lg text-stone">
        Prepariamo insieme un&apos;estate piena di gioco, scoperta e sorrisi 💛
      </p>
      <Button type="button" size="xl" onClick={onNext}>
        Iniziamo
      </Button>
    </div>
  );
}
