import { format } from 'date-fns';
import type { TimerSession } from '../catalog/types';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Tempo effettivamente trascorso (running) al netto delle pause, in ms.
 * `now`, `startedAt`, `pausedAt` sono sempre epoch ms passati esplicitamente:
 * nessuna lettura diretta dell'orologio qui dentro (logica pura).
 */
export function elapsedMs(s: TimerSession, now: number): number {
  const ongoingPause = s.pausedAt !== null ? now - s.pausedAt : 0;
  const raw = now - s.startedAt - s.pausedTotalMs - ongoingPause;
  return Math.max(0, raw);
}

/** Frazione [0,1] di avanzamento del timer rispetto a `durationMs`. */
export function progressOf(s: TimerSession, now: number): number {
  return clamp01(elapsedMs(s, now) / s.durationMs);
}

/**
 * Frazione di riempimento [0,1] del segmento `arcIndex` (0-based) di un arco
 * diviso in 7 spicchi (arcobaleno). Ogni spicchio si riempie in sequenza:
 * il segmento i è pieno quando progress ha superato (i+1)/7.
 */
export function fillFraction(progress: number, arcIndex: number): number {
  return clamp01(progress * 7 - arcIndex);
}

/** Angolo del sole in gradi: 180° (orizzonte sx) → 0° (orizzonte dx). */
export function sunAngleDeg(progress: number): number {
  return 180 - progress * 180;
}

/**
 * Etichetta italiana dell'orario di fine, es. "termina alle 13:58".
 * Basata solo sui campi della sessione (no `now`): l'eventuale pausa in corso
 * non è nota a priori (durata indeterminata), quindi non viene proiettata;
 * le pause già chiuse (`pausedTotalMs`) spostano invece l'orario di fine in avanti.
 */
export function endTimeLabel(s: TimerSession): string {
  const endAt = s.startedAt + s.durationMs + s.pausedTotalMs;
  return `termina alle ${format(endAt, 'HH:mm')}`;
}

/**
 * Ricostruisce lo stato al mount dell'app (es. dopo riavvio del telefono).
 * - clock indietro (now < startedAt): stato non affidabile → null (E12).
 * - running con progress ≥ 1 già raggiunto: passa direttamente a celebrating,
 *   così l'utente non vede un timer "scaduto ma fermo a running".
 * - qualunque altro caso: sessione invariata.
 */
export function restore(s: TimerSession | null, now: number): TimerSession | null {
  if (s === null) return null;
  if (now < s.startedAt) return null;
  if (s.status === 'running' && progressOf(s, now) >= 1) {
    return { ...s, status: 'celebrating' };
  }
  return s;
}
