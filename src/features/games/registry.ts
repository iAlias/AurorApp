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
import { DisegnaColDito } from './DisegnaColDito';
import { DiChiELOmbra } from './DiChiELOmbra';
import { ChiViveQui } from './ChiViveQui';
import { ComeSiSente } from './ComeSiSente';
import { ScoppiaLeBolle } from './ScoppiaLeBolle';
import { SuonaLArcobaleno } from './SuonaLArcobaleno';
import { IlTreninoDeiNumeri } from './IlTreninoDeiNumeri';

/** Voce del catalogo dei giochi: usata sia dalla griglia (`GamesPage`) sia
 * dal routing (`gameId` diventa il segmento `/giochi/:gameId`). */
export interface GameDef {
  id: string; // slug per la route, es. 'tocca-il-colore'
  title: string;
  emoji: string;
  skill: string; // riga sotto il titolo, es. 'Allena: i colori'
  Component: ComponentType;
}

/** Registro dei 16 giochi disponibili: l'ordine qui è l'ordine visivo della
 * griglia in `GamesPage` (i più immediati per i più piccoli in alto). */
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
  {
    id: 'disegna-col-dito',
    title: 'Disegna col dito',
    emoji: '🎨',
    skill: 'Allena: la fantasia',
    Component: DisegnaColDito,
  },
  {
    id: 'scoppia-le-bolle',
    title: 'Scoppia le bolle',
    emoji: '🫧',
    skill: 'Allena: contare e la mira',
    Component: ScoppiaLeBolle,
  },
  {
    id: 'suona-l-arcobaleno',
    title: "Suona l'arcobaleno",
    emoji: '🎶',
    skill: 'Allena: la musica',
    Component: SuonaLArcobaleno,
  },
  {
    id: 'come-si-sente',
    title: 'Come si sente?',
    emoji: '😊',
    skill: 'Allena: le emozioni',
    Component: ComeSiSente,
  },
  {
    id: 'di-chi-e-l-ombra',
    title: "Di chi è l'ombra?",
    emoji: '👤',
    skill: 'Allena: osservare le forme',
    Component: DiChiELOmbra,
  },
  {
    id: 'chi-vive-qui',
    title: 'Chi vive qui?',
    emoji: '🏡',
    skill: 'Allena: animali e ambienti',
    Component: ChiViveQui,
  },
  {
    id: 'il-trenino-dei-numeri',
    title: 'Il trenino dei numeri',
    emoji: '🚂',
    skill: 'Allena: i numeri in ordine',
    Component: IlTreninoDeiNumeri,
  },
];
