import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionPref } from '../../ui/motion';

export interface TouchStarsProps {
  className?: string;
}

/** Pool di particelle riusate (§8.3): al massimo questo numero di stelline
 * scintillanti puo' essere vivo in un dato momento — un nuovo tocco ricicla
 * lo slot più vecchio invece di allocarne uno nuovo senza limite. */
const POOL_SIZE = 12;

interface StarInstance {
  slot: number;
  key: number;
  x: number;
  y: number;
}

/**
 * Area "innocua" della schermata `TimerRun` (FR-6): ogni tocco della bimba
 * fuori dai controlli adulto genera una stellina scintillante nel punto
 * toccato, puro delight senza alcuna azione (nessun evento verso la
 * macchina a stati del timer).
 */
export function TouchStars({ className }: TouchStarsProps) {
  const [stars, setStars] = useState<StarInstance[]>([]);
  const nextSlotRef = useRef(0);
  const nextKeyRef = useRef(0);
  const reducedMotion = useReducedMotionPref();

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const slot = nextSlotRef.current;
    nextSlotRef.current = (slot + 1) % POOL_SIZE;
    nextKeyRef.current += 1;

    const star: StarInstance = {
      slot,
      key: nextKeyRef.current,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setStars((prev) => [...prev.filter((s) => s.slot !== slot), star]);
  }

  function remove(slot: number, key: number) {
    setStars((prev) => prev.filter((s) => !(s.slot === slot && s.key === key)));
  }

  return (
    <div
      data-testid="touch-stars-area"
      onPointerDown={handlePointerDown}
      className={className}
    >
      {stars.map((s) => (
        <motion.span
          key={s.key}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 0.5, y: 0 }}
          animate={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.5, y: -36 }}
          transition={{ duration: reducedMotion ? 0.4 : 0.7, ease: 'easeOut' }}
          onAnimationComplete={() => remove(s.slot, s.key)}
          style={{ position: 'absolute', left: s.x, top: s.y }}
          className="pointer-events-none text-2xl"
          aria-hidden="true"
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}
