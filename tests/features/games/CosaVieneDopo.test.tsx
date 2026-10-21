import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CosaVieneDopo } from '../../../src/features/games/CosaVieneDopo';
import { optionButtons } from './optionButtons';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocca burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

function renderGame() {
  return render(
    <MemoryRouter>
      <CosaVieneDopo />
    </MemoryRouter>,
  );
}

/**
 * Smoke test: il generatore `makeSequenceRound` è già coperto a fondo in
 * `tests/core/games/sequenceRound.test.ts` — qui si verifica solo che il
 * componente monti, mostri le 4 emoji + il riquadro "?" e 2 bottoni-opzione,
 * e che scegliere l'opzione giusta (dedotta dai due `aria-label` disponibili
 * confrontandoli con `shown`) faccia avanzare la stella.
 */
describe('CosaVieneDopo (smoke)', () => {
  test('mostra 4 emoji + il riquadro "?" e 2 bottoni-opzione', () => {
    const { container } = renderGame();

    // Il titolo (h1, da GameShell) e il prompt sotto la sequenza condividono
    // lo stesso testo "Cosa viene dopo?": si contano entrambe le occorrenze
    // invece di usare getByText, che fallirebbe per ambiguità.
    expect(screen.getAllByText('Cosa viene dopo?')).toHaveLength(2);
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(optionButtons()).toHaveLength(2);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();

    // Le singole stelle di avanzamento (GameShell) hanno anch'esse
    // `aria-hidden="true"`, quindi si individua la riga della sequenza per
    // classe invece che per attributo (altrimenti si matcherebbe la prima
    // stella, che non ha figli). La riga contiene 4 span-emoji + 1 span "?".
    const shownRow = container.querySelector('.text-5xl');
    const shownSpans = [...(shownRow?.querySelectorAll('span') ?? [])].filter(
      (el) => el.textContent !== '?',
    );
    expect(shownSpans).toHaveLength(4);
  });

  test('la risposta giusta fa avanzare di una stella, quella sbagliata no', () => {
    vi.useFakeTimers();
    renderGame();

    const buttons = optionButtons();
    const [first, second] = buttons;

    fireEvent.click(first);
    act(() => {
      vi.advanceTimersByTime(700);
    });

    if (screen.queryByLabelText('1 round su 5 completati')) {
      expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
      return;
    }

    // `first` era sbagliata: il round non è avanzato, si ritenta con l'altra.
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
    fireEvent.click(second);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });
});
