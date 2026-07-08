import type { TimerKind, TimerSession } from '../catalog/types';
import { progressOf } from './progress';

export type TimerEvent =
  | { type: 'START'; meal: TimerKind; durationMs: number; dateISO: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH_EARLY' } // long-press "Abbiamo già finito!"
  | { type: 'TICK' } // valutato dal loop rAF: running→celebrating se progress≥1
  | { type: 'CELEBRATION_DONE' } // → done
  | { type: 'EXIT' } // abbandono esplicito (long-press) → null
  | { type: 'FAST_FORWARD'; ms: number }; // demo/test: sposta startedAt indietro, mai un secondo orologio

/**
 * Macchina a stati pura del timer pasto. Nessun accesso diretto all'orologio:
 * `now` è sempre passato dal chiamante (loop rAF / handler UI).
 * Eventi non validi per lo stato corrente ritornano la sessione invariata
 * (stessa identità di riferimento) per idempotenza (E4).
 */
export function next(s: TimerSession | null, e: TimerEvent, now: number): TimerSession | null {
  switch (e.type) {
    case 'START':
      return {
        meal: e.meal,
        dateISO: e.dateISO,
        startedAt: now,
        durationMs: e.durationMs,
        pausedAt: null,
        pausedTotalMs: 0,
        status: 'running',
      };

    case 'PAUSE':
      if (s === null || s.status !== 'running') return s;
      return { ...s, status: 'paused', pausedAt: now };

    case 'RESUME':
      if (s === null || s.status !== 'paused' || s.pausedAt === null) return s;
      return {
        ...s,
        status: 'running',
        pausedAt: null,
        pausedTotalMs: s.pausedTotalMs + (now - s.pausedAt),
      };

    case 'FINISH_EARLY': {
      if (s === null || (s.status !== 'running' && s.status !== 'paused')) return s;
      // Chiude l'eventuale pausa in corso prima di passare a celebrating.
      const pausedTotalMs =
        s.status === 'paused' && s.pausedAt !== null
          ? s.pausedTotalMs + (now - s.pausedAt)
          : s.pausedTotalMs;
      return { ...s, status: 'celebrating', pausedAt: null, pausedTotalMs };
    }

    case 'TICK':
      if (s === null || s.status !== 'running') return s;
      if (progressOf(s, now) >= 1) return { ...s, status: 'celebrating' };
      return s;

    case 'CELEBRATION_DONE':
      if (s === null || s.status !== 'celebrating') return s;
      return { ...s, status: 'done' };

    case 'EXIT':
      return null;

    // Nessun contatore parallelo: si "riscrive la storia" spostando indietro
    // startedAt, cosi' elapsedMs/progressOf (già calcolati sempre da
    // Date.now() rispetto a startedAt) risultano già più avanti da soli,
    // senza introdurre un secondo orologio (solo per demo/test, §FAST_FORWARD).
    case 'FAST_FORWARD':
      if (s === null || s.status !== 'running') return s;
      return { ...s, startedAt: s.startedAt - e.ms };
  }
}
