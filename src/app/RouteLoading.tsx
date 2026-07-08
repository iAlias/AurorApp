import { motion } from 'framer-motion';
import { useReducedMotionPref } from '../ui/motion';

/**
 * Fallback di `Suspense` per le route lazy (Task 22, §M7 performance):
 * un piccolo sole che ruota dolcemente mentre il chunk della schermata
 * arriva dalla rete/cache del service worker. Con `useReducedMotionPref()`
 * attivo la rotazione continua sparisce (AC-10) e resta solo un lieve
 * fade/pulse di opacita, coerente con `PageFlip3D`/`confetti`.
 */
export function RouteLoading() {
  const reducedMotion = useReducedMotionPref();

  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Caricamento in corso"
    >
      <motion.span
        aria-hidden="true"
        className="text-5xl"
        animate={reducedMotion ? { opacity: [0.4, 1, 0.4] } : { rotate: 360 }}
        transition={
          reducedMotion
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 1.4, repeat: Infinity, ease: 'linear' }
        }
      >
        ☀️
      </motion.span>
    </div>
  );
}
