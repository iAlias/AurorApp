import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { useLongPress } from '../../src/ui/useLongPress';

// jsdom (v25) non implementa il costruttore globale PointerEvent: senza un
// polyfill minimo, `fireEvent.pointerDown/Move/Up` degraderebbero a un
// `Event` generico e clientX/clientY resterebbero `undefined`. Il polyfill
// estende MouseEvent (supportato da jsdom) che gia' accetta clientX/clientY
// nel dizionario di init — sufficiente per i test, non serve altro.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
  }
});

function Probe({ onFire }: { onFire: () => void }) {
  const { handlers, progress, pressing } = useLongPress(onFire, { ms: 3000, moveTolerancePx: 12 });
  return createElement('div', {
    'data-testid': 'target',
    'data-progress': String(progress),
    'data-pressing': String(pressing),
    ...handlers,
  });
}

function renderProbe(onFire: () => void): HTMLElement {
  render(createElement(Probe, { onFire }));
  return screen.getByTestId('target');
}

function readProgress(el: HTMLElement): number {
  return Number(el.getAttribute('data-progress'));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLongPress', () => {
  test('attiva il callback dopo 3000ms di pressione ferma', () => {
    const onFire = vi.fn();
    const target = renderProbe(onFire);

    act(() => {
      fireEvent.pointerDown(target, { clientX: 100, clientY: 100 });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onFire).toHaveBeenCalledTimes(1);
    expect(target.getAttribute('data-pressing')).toBe('false');
  });

  test('un rilascio a 2900ms non attiva nulla', () => {
    const onFire = vi.fn();
    const target = renderProbe(onFire);

    act(() => {
      fireEvent.pointerDown(target, { clientX: 100, clientY: 100 });
    });
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    act(() => {
      fireEvent.pointerUp(target, { clientX: 100, clientY: 100 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onFire).not.toHaveBeenCalled();
  });

  test('uno spostamento di 20px annulla la pressione (il dito che striscia)', () => {
    const onFire = vi.fn();
    const target = renderProbe(onFire);

    act(() => {
      fireEvent.pointerDown(target, { clientX: 100, clientY: 100 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent.pointerMove(target, { clientX: 120, clientY: 100 }); // distanza 20px
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onFire).not.toHaveBeenCalled();
    expect(target.getAttribute('data-pressing')).toBe('false');
    expect(readProgress(target)).toBe(0);
  });

  test('il progresso cresce in modo monotono durante la pressione', () => {
    const onFire = vi.fn();
    const target = renderProbe(onFire);

    act(() => {
      fireEvent.pointerDown(target, { clientX: 0, clientY: 0 });
    });

    const samples: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      act(() => {
        vi.advanceTimersByTime(500);
      });
      samples.push(readProgress(target));
    }

    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[samples.length - 1]).toBe(1);
    expect(onFire).toHaveBeenCalledTimes(1);
  });
});
