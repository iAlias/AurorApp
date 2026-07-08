import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { springSoft, useReducedMotionPref } from '../ui/motion';

/**
 * Toast discreto per l'aggiornamento del service worker (FR-10). Il plugin
 * PWA è configurato con `registerType: 'prompt'` (vedi `vite.config.ts`):
 * il nuovo SW resta in attesa finché l'utente non conferma da qui, così
 * l'app non si ricarica mai sotto ai piedi della bimba mentre la usa.
 */
export function UpdatePrompt() {
  const reducedMotion = useReducedMotionPref();
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [needRefreshFlag] = needRefresh;

  const transition = reducedMotion ? { duration: 0.15 } : springSoft;

  return (
    <AnimatePresence>
      {needRefreshFlag && (
        <motion.div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 flex items-center justify-between gap-3 rounded-card bg-deep px-4 py-3 text-cream shadow-lift lg:inset-x-auto lg:right-6 lg:w-96"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={transition}
        >
          <span className="font-body text-sm font-semibold">Nuova versione disponibile — Aggiorna</span>
          <button
            type="button"
            className="shrink-0 rounded-full bg-sun px-3 py-1.5 font-display text-sm font-bold text-deep"
            onClick={() => updateServiceWorker(true)}
          >
            Aggiorna
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
