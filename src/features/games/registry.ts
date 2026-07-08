import type { ComponentType } from 'react';

/** Voce del catalogo dei giochi: usata sia dalla griglia (`GamesPage`) sia
 * dal routing (`gameId` diventa il segmento `/giochi/:gameId`). */
export interface GameDef {
  id: string; // slug per la route, es. 'tocca-il-colore'
  title: string;
  emoji: string;
  skill: string; // riga sotto il titolo, es. 'Allena: i colori'
  Component: ComponentType;
}

/** Registro dei giochi disponibili: parte vuoto (Task 2, solo
 * infrastruttura) — i Task 3-6 aggiungono qui le loro 10 voci. */
export const GAMES: GameDef[] = [];
