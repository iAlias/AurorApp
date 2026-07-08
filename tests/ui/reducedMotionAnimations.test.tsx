import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useApp } from '../../src/app/store';
import { StepWelcome } from '../../src/features/wizard/StepWelcome';
import { WizardPage } from '../../src/features/wizard/WizardPage';
import { TouchStars } from '../../src/features/mealTimer/TouchStars';

// jsdom (v25) non implementa il costruttore globale PointerEvent: stesso
// polyfill minimo di tests/ui/useLongPress.test.ts, altrimenti
// fireEvent.pointerDown degrada a un Event generico e clientX/clientY
// restano undefined (→ NaN nelle coordinate della stellina).
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

/**
 * QA finale (Task 23, AC-10 §14): oltre alle animazioni piu' ovvie
 * (PageFlip3D, confetti, countdown, oscillazione del sole, pulsazione
 * "quasi finito" — gia' verificate altrove), l'audit ha trovato due
 * animazioni "di delight" che ignoravano `prefers-reduced-motion` e
 * animavano comunque scala/traslazione: lo scintillio delle stelline al
 * tocco (`TouchStars`, riusato anche per le stelline di arco completato in
 * `TimerRun`) e l'illustrazione d'ingresso del wizard (`StepWelcome`).
 * Corrette qui sotto; questi test fissano il comportamento richiesto —
 * con reduced motion attivo, SOLO un fade di opacita', mai `scale`/`y`.
 *
 * Follow-up alla revisione del Task 23: nello stesso `WizardPage.tsx` i
 * pallini indicatori di step (diversi dal page-flip tra step, gia' gated)
 * avevano uno spring di scala non disattivato da reduced motion. Corretto;
 * test di regressione qui sotto.
 */
function setReducedMotion(value: 'on' | 'off') {
  useApp.setState((s) => ({ settings: { ...s.settings, reducedMotion: value } }));
}

afterEach(() => {
  setReducedMotion('off');
});

describe('StepWelcome — reduced motion (AC-10)', () => {
  test('reducedMotion "on": nessuna scala nello stile iniziale, solo opacity', () => {
    setReducedMotion('on');
    act(() => {
      render(<StepWelcome onNext={() => {}} />);
    });

    const illustration = screen.getByText('🌈');
    const style = illustration.getAttribute('style') ?? '';
    expect(style).not.toContain('scale');
  });

  test('reducedMotion "off": lo stile iniziale include la scala (comportamento pieno invariato)', () => {
    setReducedMotion('off');
    act(() => {
      render(<StepWelcome onNext={() => {}} />);
    });

    const illustration = screen.getByText('🌈');
    const style = illustration.getAttribute('style') ?? '';
    expect(style).toContain('scale(0.7)');
  });
});

describe('TouchStars — reduced motion (AC-10)', () => {
  test('reducedMotion "on": la stellina al tocco non ha scala/traslazione nello stile iniziale', () => {
    setReducedMotion('on');
    act(() => {
      render(<TouchStars />);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId('touch-stars-area'), { clientX: 10, clientY: 10 });
    });

    const star = screen.getByText('✦');
    const style = star.getAttribute('style') ?? '';
    expect(style).not.toContain('scale');
    expect(style).not.toContain('translate');
  });

  test('reducedMotion "off": la stellina al tocco parte scalata (comportamento pieno invariato)', () => {
    setReducedMotion('off');
    act(() => {
      render(<TouchStars />);
    });

    act(() => {
      fireEvent.pointerDown(screen.getByTestId('touch-stars-area'), { clientX: 10, clientY: 10 });
    });

    const star = screen.getByText('✦');
    const style = star.getAttribute('style') ?? '';
    expect(style).toContain('scale(0.5)');
  });
});

describe('WizardPage — pallini step, reduced motion (AC-10)', () => {
  test('reducedMotion "on": il pallino attivo non ha scala nello stile', () => {
    setReducedMotion('on');
    act(() => {
      render(
        <MemoryRouter initialEntries={['/wizard']}>
          <WizardPage />
        </MemoryRouter>,
      );
    });

    const activeDot = screen.getByTestId('wizard-step-dot-0');
    const style = activeDot.getAttribute('style') ?? '';
    expect(style).not.toContain('scale');
  });

  test('reducedMotion "off": il pallino attivo parte scalato (comportamento pieno invariato)', () => {
    setReducedMotion('off');
    act(() => {
      render(
        <MemoryRouter initialEntries={['/wizard']}>
          <WizardPage />
        </MemoryRouter>,
      );
    });

    const activeDot = screen.getByTestId('wizard-step-dot-0');
    const style = activeDot.getAttribute('style') ?? '';
    expect(style).toContain('scale(1.4)');
  });
});
