import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { springSoft, useReducedMotionPref } from './motion';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom-sheet mobile: sale dal bordo inferiore (`slide-up`, solo
 * `transform`/`opacity`). Esc e click sul backdrop chiudono; il focus va
 * al pannello all'apertura e torna all'elemento precedente alla chiusura.
 */
export function Sheet({ open, onClose, children }: SheetProps) {
  const reducedMotion = useReducedMotionPref();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const backdropTransition = reducedMotion ? { duration: 0.15 } : { duration: 0.3 };
  const panelTransition = reducedMotion ? { duration: 0.15 } : springSoft;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-backdrop"
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Finestra"
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-modal bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift outline-none"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
            transition={panelTransition}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
