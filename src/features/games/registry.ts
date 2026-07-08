import type { ComponentType } from 'react';
import { ToccaIlColore } from './ToccaIlColore';
import { ContaConMe } from './ContaConMe';
import { TrovaLaLettera } from './TrovaLaLettera';
import { LeFormeGiuste } from './LeFormeGiuste';
import { GrandeEPiccolo } from './GrandeEPiccolo';
import { TrovaLIntruso } from './TrovaLIntruso';
import { CosaVieneDopo } from './CosaVieneDopo';
import { MemoriaDegliAnimali } from './MemoriaDegliAnimali';
import { DalPiccoloAlGrande } from './DalPiccoloAlGrande';

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
  {
    id: 'le-forme-giuste',
    title: 'Le forme giuste',
    emoji: '🔷',
    skill: 'Allena: le forme',
    Component: LeFormeGiuste,
  },
  {
    id: 'grande-e-piccolo',
    title: 'Grande e piccolo',
    emoji: '🐘',
    skill: 'Allena: grande e piccolo',
    Component: GrandeEPiccolo,
  },
  {
    id: 'trova-l-intruso',
    title: "Trova l'intruso",
    emoji: '🕵️',
    skill: 'Allena: la logica',
    Component: TrovaLIntruso,
  },
  {
    id: 'cosa-viene-dopo',
    title: 'Cosa viene dopo?',
    emoji: '🔁',
    skill: 'Allena: le sequenze',
    Component: CosaVieneDopo,
  },
  {
    id: 'memoria-degli-animali',
    title: 'Memoria degli animali',
    emoji: '🐾',
    skill: 'Allena: la memoria',
    Component: MemoriaDegliAnimali,
  },
  {
    id: 'dal-piccolo-al-grande',
    title: 'Dal più piccolo al più grande',
    emoji: '📏',
    skill: 'Allena: mettere in ordine',
    Component: DalPiccoloAlGrande,
  },
];
