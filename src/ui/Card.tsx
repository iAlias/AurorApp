import type { KeyboardEvent, ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Superficie base del design system: angoli `rounded-card` (24px), sfondo
 * `card`, ombra `soft` (§9.2). Se `onClick` e' passato diventa un elemento
 * interattivo (ruolo bottone, focus da tastiera, Invio/Spazio attivano).
 */
export function Card({ children, className = '', onClick }: CardProps) {
  const interactive = Boolean(onClick);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  const classes = [
    'rounded-card bg-card shadow-soft p-4',
    interactive ? 'w-full cursor-pointer text-left' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}
