import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { pageFlipVariants, useReducedMotionPref } from './motion';

export interface PageFlip3DProps {
  children: ReactNode;
}

/** Easing dedicato al flip di pagina (§9.3), condiviso con Modal. */
const PAGE_FLIP_EASE = [0.32, 0.72, 0, 1] as const;

const FADE_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

/**
 * Wrapper di transizione tra pagine/route (§9.3): un leggero "flip" 3D in
 * prospettiva (`pageFlipVariants`, definite in `motion.ts` — non ridefinite
 * qui) quando si passa da una route all'altra dentro `Layout`. Con
 * `useReducedMotionPref()` attivo, salta del tutto la rotazione 3D e passa a
 * un semplice cross-fade di 150ms (nessun `x`/`rotateY`, solo `opacity`).
 *
 * La chiave di animazione è il `pathname` corrente: ogni cambio di route
 * smonta/rimonta lo `motion.div`, facendo scattare exit/enter in sequenza
 * (`mode="wait"`, mai le due pagine sovrapposte).
 */
export function PageFlip3D({ children }: PageFlip3DProps) {
  const location = useLocation();
  const reducedMotion = useReducedMotionPref();

  const variants = reducedMotion ? FADE_VARIANTS : pageFlipVariants;
  const transition = reducedMotion ? { duration: 0.15 } : { duration: 0.45, ease: PAGE_FLIP_EASE };

  return (
    <div style={{ perspective: 1200 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
