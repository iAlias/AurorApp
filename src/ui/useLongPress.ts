import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface UseLongPressOptions {
  ms?: number;
  moveTolerancePx?: number;
}

export interface UseLongPressResult {
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: (e: ReactPointerEvent) => void;
  };
  progress: number;
  pressing: boolean;
}

/** Passo dell'intervallo di avanzamento (ms): granularita' dell'anello di progresso. */
const TICK_MS = 50;

/**
 * Pressione lunga "a prova di bimba" (§8.3): si attiva solo dopo `ms`
 * millisecondi di pressione ferma su un punto; un dito che si sposta oltre
 * `moveTolerancePx` annulla tutto senza effetti collaterali (la bimba che
 * striscia il dito non deve mai attivare pausa/uscita). `progress` (0..1)
 * alimenta l'anello SVG di feedback visivo.
 */
export function useLongPress(cb: () => void, opts: UseLongPressOptions = {}): UseLongPressResult {
  const { ms = 3000, moveTolerancePx = 12 } = opts;

  const [progress, setProgress] = useState(0);
  const [pressing, setPressing] = useState(false);

  const cbRef = useRef(cb);
  cbRef.current = cb;
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startPointRef.current = null;
    elapsedRef.current = 0;
    setPressing(false);
    setProgress(0);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      startPointRef.current = { x: e.clientX, y: e.clientY };
      elapsedRef.current = 0;
      setPressing(true);
      setProgress(0);

      intervalRef.current = setInterval(() => {
        elapsedRef.current = Math.min(elapsedRef.current + TICK_MS, ms);
        setProgress(elapsedRef.current / ms);

        if (elapsedRef.current >= ms) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          startPointRef.current = null;
          setPressing(false);
          cbRef.current();
        }
      }, TICK_MS);
    },
    [ms],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const start = startPointRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > moveTolerancePx) {
        stop();
      }
    },
    [moveTolerancePx, stop],
  );

  const onPointerUp = useCallback(() => {
    stop();
  }, [stop]);

  const onPointerCancel = useCallback(() => {
    stop();
  }, [stop]);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    progress,
    pressing,
  };
}
