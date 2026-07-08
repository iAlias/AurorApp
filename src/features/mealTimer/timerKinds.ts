import type { TimerKind } from '../../core/catalog/types';

// Copy e valori di default per i 5 preset del timer arcobaleno (pranzo/cena
// storici + vestirsi/riordino/campo libero): un'unica mappa da cui TimerStart
// e Celebration leggono etichette/emoji, cosi' aggiungere un futuro preset
// resta un cambiamento in un solo posto.
export interface TimerKindCopy {
  emoji: string;
  /** Etichetta del chip in TimerStart. */
  chip: string;
  /** Testo del bottone di avvio. */
  startButton: string;
  /** Riga sotto "Bravissima!" in Celebration. */
  celebration: string;
  /** Durata di default in minuti (per pranzo/cena si usano comunque settings.meals). */
  defaultMinutes: number;
}

export const TIMER_KINDS: Record<TimerKind, TimerKindCopy> = {
  pranzo:   { emoji: '🍝', chip: 'Pranzo',       startButton: 'Si mangia! 🍝',   celebration: 'Pranzo delizioso! 🍝',        defaultMinutes: 60 },
  cena:     { emoji: '🍽️', chip: 'Cena',         startButton: 'Si mangia! 🍽️',  celebration: 'Cena deliziosa! 🍽️',         defaultMinutes: 60 },
  vestirsi: { emoji: '👕', chip: 'Vestirsi',     startButton: 'Ci vestiamo! 👕', celebration: 'Tutta vestita, che brava! 👕', defaultMinutes: 10 },
  riordino: { emoji: '🧸', chip: 'Riordino',     startButton: 'Si riordina! 🧸', celebration: 'Tutto in ordine! 🧸',          defaultMinutes: 5 },
  libero:   { emoji: '⭐', chip: 'Altro',         startButton: 'Via! ⭐',         celebration: 'Ce l’abbiamo fatta! ⭐',  defaultMinutes: 15 },
};

export const TIMER_KIND_ORDER: TimerKind[] = ['pranzo', 'cena', 'vestirsi', 'riordino', 'libero'];
