import { act, render } from '@testing-library/react';
import { useApp } from '../../../src/app/store';
import { TimerRun } from '../../../src/features/mealTimer/TimerRun';
import { audioManager } from '../../../src/ui/audio';
import type { TimerSession } from '../../../src/core/catalog/types';

// jsdom non implementa il canvas: `burst()` (coriandoli) non e' coinvolto in
// questo componente per lo stato 'running', ma mockiamo comunque per
// coerenza con `celebrationSoundToggle.test.tsx` nel caso venga toccato da
// un refactor futuro.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

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

function tickCallCount(playSpy: ReturnType<typeof vi.spyOn>): number {
  return playSpy.mock.calls.filter((call) => call[0] === 'tick').length;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.spyOn(Date, 'now').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TimerRun — ticchettio durante il conteggio (running)', () => {
  test('soundsOn: true → un "tick" ogni secondo mentre running', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    expect(tickCallCount(playSpy)).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(tickCallCount(playSpy)).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(tickCallCount(playSpy)).toBe(3);
  });

  test('soundsOn: false → nessun "tick" mai, anche dopo diversi secondi', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: false } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(tickCallCount(playSpy)).toBe(0);
  });

  test('in pausa il ticchettio si ferma (nessun nuovo "tick" dopo la pausa)', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    const { rerender } = render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const countWhileRunning = tickCallCount(playSpy);
    expect(countWhileRunning).toBe(2);

    rerender(<TimerRun session={sessionFixture({ status: 'paused', pausedAt: 2000 })} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(tickCallCount(playSpy)).toBe(countWhileRunning);
  });

  test('lo smontaggio ferma il ticchettio (nessun leak di setInterval)', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    const { unmount } = render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const countBeforeUnmount = tickCallCount(playSpy);

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(tickCallCount(playSpy)).toBe(countBeforeUnmount);
  });

  test('non suona mai durante il countdown 3-2-1 (fuori scope: quello vive in TimerStart, non in TimerRun)', () => {
    // TimerRun riceve gia' una sessione 'running': il countdown 3-2-1 non ha
    // un suo stato qui, quindi basta verificare che il primo "tick" arrivi
    // solo dopo 1000ms dal mount di una sessione già running, mai prima.
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<TimerRun session={sessionFixture()} onExit={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(tickCallCount(playSpy)).toBe(0);
  });
});
