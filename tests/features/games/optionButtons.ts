import { screen } from '@testing-library/react';

/** I bottoni del gioco, senza il 🔊 "Ascolta la consegna" di GameShell. */
export function optionButtons(): HTMLElement[] {
  return screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label') !== 'Ascolta la consegna');
}
