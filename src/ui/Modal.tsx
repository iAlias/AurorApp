import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotionPref } from './motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modale centrale con "flip-in" 3D (§9.3): entra con una leggera rotazione
 * in prospettiva + scala, invece di un semplice fade — coerente col tono
 * giocoso del design system. Esc chiude, il click sul backdrop chiude, ed
 * e' presente un semplice focus-trap (Tab/Shift+Tab restano dentro il
 * dialogo; il focus torna all'elemento che l'aveva prima dell'apertura).
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const reducedMotion = useReducedMotionPref();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusables?.[0] ?? dialog)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const overlayTransition = reducedMotion ? { duration: 0.15 } : { duration: 0.3 };
  const dialogTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-deep/40 p-4"
          style={{ perspective: 1200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Finestra'}
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-modal bg-card p-6 shadow-lift outline-none"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotateX: -18, scale: 0.92 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, rotateX: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotateX: 14, scale: 0.94 }}
            transition={dialogTransition}
          >
            {title && (
              <h2 id={titleId} className="mb-3 font-display text-2xl text-deep">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
