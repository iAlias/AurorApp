import { act, fireEvent, render, screen } from '@testing-library/react';
import { useApp } from '../../../src/app/store';
import { TimerRun } from '../../../src/features/mealTimer/TimerRun';
import { audioManager } from '../../../src/ui/audio';
import type { TimerSession } from '../../../src/core/catalog/types';

// jsdom non implementa il canvas: mock coerente con gli altri test di TimerRun.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

// jsdom (v25) non implementa il costruttore globale PointerEvent (stesso
// polyfill di tests/ui/useLongPress.test.ts, necessario per fireEvent.pointerDown/Up).
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

function sessionFixture(overrides: Partial<TimerSession> = {}): TimerSession {
  return {
    meal: 'pranzo',
    dateISO: '2026-07-04',
    startedAt: 0,
    durationMs: 60 * 60_000,
    pausedAt: null,
    pausedTotalMs: 0,
    status: 'running',
    ...overrides,
  };
}

/** Simula una pressione lunga completa (>= 3000ms) su un elemento gia' nel DOM. */
function longPress(el: Element) {
  act(() => {
    fireEvent.pointerDown(el, { clientX: 50, clientY: 50 });
  });
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  act(() => {
    fireEvent.pointerUp(el, { clientX: 50, clientY: 50 });
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.spyOn(Date, 'now').mockReturnValue(0);
  vi.spyOn(audioManager, 'play').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TimerRun — conto alla rovescia mm:ss', () => {
  test('mostra il tempo rimanente formattato mm:ss, calcolato da remainingMs', () => {
    render(<TimerRun session={sessionFixture({ durationMs: 10 * 60_000 })} onExit={() => {}} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  test('riflette remainingMs per una sessione già parzialmente trascorsa (65s su 5min → 03:55)', () => {
    // startedAt spostato indietro di 65s rispetto a "ora" (Date.now()=0):
    // stesso effetto di FAST_FORWARD, nessun bisogno di avanzare rAF nel test.
    render(
      <TimerRun
        session={sessionFixture({ durationMs: 5 * 60_000, startedAt: -65_000 })}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText('03:55')).toBeInTheDocument();
  });
});

describe('TimerRun — controllo velocità 2x/4x/8x', () => {
  test('ogni pressione lunga riuscita fa avanzare il ciclo 1x→2x→4x→8x→1x', () => {
    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    const speedButton = screen.getByLabelText(/Velocità 1×/);
    expect(screen.getByText('1x')).toBeInTheDocument();

    longPress(speedButton);
    expect(screen.getByText('2x')).toBeInTheDocument();

    longPress(screen.getByLabelText(/Velocità 2×/));
    expect(screen.getByText('4x')).toBeInTheDocument();

    longPress(screen.getByLabelText(/Velocità 4×/));
    expect(screen.getByText('8x')).toBeInTheDocument();

    longPress(screen.getByLabelText(/Velocità 8×/));
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  test('un tap semplice (rilascio prima dei 3s) non cambia la velocità', () => {
    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);
    const speedButton = screen.getByLabelText(/Velocità 1×/);

    act(() => {
      fireEvent.pointerDown(speedButton, { clientX: 50, clientY: 50 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent.pointerUp(speedButton, { clientX: 50, clientY: 50 });
    });

    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  test('a 1x il progress avanza solo del tempo reale trascorso (nessun FAST_FORWARD dispacciato)', () => {
    useApp.setState({ timer: sessionFixture({ durationMs: 60 * 60_000 }) });
    render(<TimerRun session={sessionFixture({ durationMs: 60 * 60_000 })} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Nessuna accelerazione: startedAt non si e' spostato.
    expect(useApp.getState().timer?.startedAt).toBe(0);
  });

  test('a velocità > 1x il timer dispaccia FAST_FORWARD ogni 200ms, accelerando l\'avanzamento reale', () => {
    useApp.setState({ timer: sessionFixture({ durationMs: 60 * 60_000 }) });
    render(<TimerRun session={sessionFixture({ durationMs: 60 * 60_000 })} onExit={() => {}} />);

    longPress(screen.getByLabelText(/Velocità 1×/)); // -> 2x
    expect(screen.getByText('2x')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000); // 5 intervalli di FAST_FORWARD da 200ms
    });

    // A 2x, ogni 200ms reali FAST_FORWARD sposta startedAt indietro di
    // 200*(2-1)=200ms: dopo 1000ms reali (5 intervalli) startedAt e' a -1000ms,
    // cioe' il doppio del tempo reale trascorso e' "gia' passato" per la sessione.
    expect(useApp.getState().timer?.startedAt).toBe(-1000);
  });
});

describe('TimerRun — bottone "abbiamo già finito" resta gated da long-press (nessuna regressione)', () => {
  test('un tap semplice non dispaccia FINISH_EARLY', () => {
    useApp.setState({ timer: sessionFixture() });
    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);
    const finishButton = screen.getByLabelText('Abbiamo già finito');

    act(() => {
      fireEvent.pointerDown(finishButton, { clientX: 50, clientY: 50 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      fireEvent.pointerUp(finishButton, { clientX: 50, clientY: 50 });
    });

    expect(useApp.getState().timer?.status).toBe('running');
  });

  test('una pressione lunga di 3s dispaccia FINISH_EARLY → celebrating', () => {
    useApp.setState({ timer: sessionFixture() });
    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);
    const finishButton = screen.getByLabelText('Abbiamo già finito');

    longPress(finishButton);

    expect(useApp.getState().timer?.status).toBe('celebrating');
  });
});
