import type { ReactNode } from 'react';

export interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Chip di selezione a alternanza (usata per interessi/spazi nel wizard,
 * §10.3). `aria-pressed` riflette lo stato per lettori di schermo e test.
 */
export function Chip({ selected, onToggle, children }: ChipProps) {
  const classes = [
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-semibold',
    'shadow-soft transition-transform duration-150 ease-out active:scale-[.97]',
    selected ? 'bg-sun text-deep' : 'bg-card text-stone',
  ].join(' ');

  return (
    <button type="button" aria-pressed={selected} onClick={onToggle} className={classes}>
      {children}
    </button>
  );
}
