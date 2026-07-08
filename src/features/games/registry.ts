import type { ComponentType } from 'react';
import { ToccaIlColore } from './ToccaIlColore';
import { ContaConMe } from './ContaConMe';
import { TrovaLaLettera } from './TrovaLaLettera';

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
export const GAMES: GameDef[] = [
  {
    id: 'tocca-il-colore',
    title: 'Tocca il colore',
    emoji: '🔴',
    skill: 'Allena: i colori',
    Component: ToccaIlColore,
  },
  {
    id: 'conta-con-me',
    title: 'Conta con me',
    emoji: '🔢',
    skill: 'Allena: i numeri',
    Component: ContaConMe,
  },
  {
    id: 'trova-la-lettera',
    title: 'Trova la lettera',
    emoji: '🔤',
    skill: 'Allena: le lettere',
    Component: TrovaLaLettera,
  },
];
