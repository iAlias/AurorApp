import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useReducedMotionPref } from '../../src/ui/motion';
import { useApp } from '../../src/app/store';

/**
 * `matchMedia` non esiste in jsdom: un piccolo mock controllabile a mano,
 * cosi' da poter simulare sia lo stato iniziale sia un cambio "live" della
 * preferenza di sistema (`prefers-reduced-motion`) mentre il componente e'
 * montato — lo stesso schema di `useReducedMotionPref` in produzione.
 */
function installMatchMediaMock(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.delete(cb);
    },
  };

  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

function Probe() {
  const reduced = useReducedMotionPref();
  return <span data-testid="reduced">{String(reduced)}</span>;
}

function readReduced(): string {
  return screen.getByTestId('reduced').textContent ?? '';
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'system' } });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('useReducedMotionPref (AC-10)', () => {
  test("settings.reducedMotion 'on' forza ridotto anche se il sistema non lo richiede", () => {
    installMatchMediaMock(false);
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'on' } });

    render(<Probe />);

    expect(readReduced()).toBe('true');
  });

  test("settings.reducedMotion 'off' disattiva sempre, anche se il sistema lo richiede", () => {
    installMatchMediaMock(true);
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'off' } });

    render(<Probe />);

    expect(readReduced()).toBe('false');
  });

  test("settings.reducedMotion 'system' segue matchMedia quando il sistema lo richiede", () => {
    installMatchMediaMock(true);
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'system' } });

    render(<Probe />);

    expect(readReduced()).toBe('true');
  });

  test("settings.reducedMotion 'system' segue matchMedia quando il sistema NON lo richiede", () => {
    installMatchMediaMock(false);
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'system' } });

    render(<Probe />);

    expect(readReduced()).toBe('false');
  });

  test("in modalita' 'system', un cambio live della media query aggiorna il valore", () => {
    const mock = installMatchMediaMock(false);
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'system' } });

    render(<Probe />);
    expect(readReduced()).toBe('false');

    act(() => {
      mock.setMatches(true);
    });

    expect(readReduced()).toBe('true');
  });

  test('se matchMedia non e\' disponibile (browser senza supporto), non lancia e resta non ridotto', () => {
    // @ts-expect-error -- simula un ambiente senza matchMedia
    delete window.matchMedia;
    useApp.setState({ settings: { ...useApp.getState().settings, reducedMotion: 'system' } });

    expect(() => render(<Probe />)).not.toThrow();
    expect(readReduced()).toBe('false');
  });
});
