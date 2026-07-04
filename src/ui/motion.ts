import { useEffect, useState } from 'react';
import { useApp } from '../app/store';

/** Molla morbida di default per liste a cascata e transizioni leggere (§9.3). */
export const springSoft = { type: 'spring', stiffness: 300, damping: 24 } as const;

/** Variante PageFlip3D per cambio tab/route (§9.3). */
export const pageFlipVariants = {
  initial: { opacity: 0, x: 40, rotateY: 12 },
  animate: { opacity: 1, x: 0, rotateY: 0 },
  exit: { opacity: 0, x: -40, rotateY: -12 },
} as const;

function matchesReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Combina la preferenza di sistema (`prefers-reduced-motion`) con
 * l'impostazione dell'app (`settings.reducedMotion`, Task 5):
 * - `'on'`  → ridotto sempre, a prescindere dal sistema operativo;
 * - `'off'` → mai ridotto, a prescindere dal sistema operativo;
 * - `'system'` → segue la media query OS in tempo reale.
 */
export function useReducedMotionPref(): boolean {
  const setting = useApp((s) => s.settings.reducedMotion);
  const [osReduced, setOsReduced] = useState(matchesReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setOsReduced(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return osReduced;
}
