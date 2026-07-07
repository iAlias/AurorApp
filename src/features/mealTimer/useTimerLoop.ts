import { useEffect, useRef, useState } from 'react';
import type { TimerSession } from '../../core/catalog/types';
import { elapsedMs, progressOf } from '../../core/timer/progress';
import { useApp } from '../../app/store';

export interface TimerLoopState {
  progress: number;
  remainingMs: number;
}

/**
 * Ricalcola SEMPRE `progress`/`remainingMs` da `Date.now()` tramite le
 * funzioni pure di `progress.ts` (§8.1) — mai un contatore incrementale
 * separato, per evitare drift rispetto al timestamp assoluto che è
 * l'unica fonte di verità della sessione.
 */
function computeState(session: TimerSession | null): TimerLoopState {
  if (!session) return { progress: 0, remainingMs: 0 };
  const now = Date.now();
  return {
    progress: progressOf(session, now),
    remainingMs: Math.max(0, session.durationMs - elapsedMs(session, now)),
  };
}

/**
 * Hook `requestAnimationFrame` per la schermata `TimerRun` (FR-6): mentre la
 * sessione e' `running` ricalcola `{progress, remainingMs}` a ogni frame.
 * Quando il progress raggiunge 1, dispaccia una sola volta l'evento `TICK`
 * (valutato dalla macchina a stati pura, Task 14): la transizione a
 * `celebrating` — e il conteggio in `progress.mealTimersCompleted` — avviene
 * li', non qui. Il loop si ferma da solo dopo quel dispatch (l'effetto si
 * ri-esegue con la nuova sessione, il cui status non e' più `running`).
 */
export function useTimerLoop(session: TimerSession | null): TimerLoopState {
  const [loopState, setLoopState] = useState<TimerLoopState>(() => computeState(session));
  const dispatchedRef = useRef(false);

  useEffect(() => {
    setLoopState(computeState(session));

    if (!session || session.status !== 'running') {
      return undefined;
    }

    dispatchedRef.current = false;
    let rafId: number;

    function frame() {
      const next = computeState(session);
      setLoopState(next);

      if (next.progress >= 1) {
        if (!dispatchedRef.current) {
          dispatchedRef.current = true;
          useApp.getState().timerDispatch({ type: 'TICK' });
        }
        return;
      }
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [session]);

  return loopState;
}
