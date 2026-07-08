import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import type { ButtonProps } from '../../ui/Button';
import { useReducedMotionPref } from '../../ui/motion';

export interface MarkDoneButtonProps {
  onClick: () => void;
  size?: ButtonProps['size'];
}

/**
 * Bottone "Fatta! ⭐" con un piccolo "pop" di scala ad ogni click (delight,
 * oltre al `burst()` di coriandoli già gestito dal chiamante): la `key`
 * incrementale forza framer-motion a rieseguire `initial → animate` ad ogni
 * tap, anche su tap ripetuti — stesso principio "key = timestamp/contatore"
 * già usato per le stelline in `TimerRun`. Sotto `prefers-reduced-motion` il
 * pop e' del tutto assente (nessun `initial`/`animate`): il bottone resta
 * staticamente uguale, il burst() esistente e' comunque no-op in quel caso.
 */
export function MarkDoneButton({ onClick, size = 'md' }: MarkDoneButtonProps) {
  const reducedMotion = useReducedMotionPref();
  const [pulseKey, setPulseKey] = useState(0);

  function handleClick() {
    setPulseKey((k) => k + 1);
    onClick();
  }

  return (
    <motion.span
      key={pulseKey}
      initial={reducedMotion ? undefined : { scale: 1 }}
      animate={reducedMotion ? undefined : { scale: [1, 1.18, 1] }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="inline-block"
    >
      <Button type="button" size={size} onClick={handleClick}>
        Fatta! ⭐
      </Button>
    </motion.span>
  );
}
