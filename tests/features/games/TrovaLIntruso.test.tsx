import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrovaLIntruso } from '../../../src/features/games/TrovaLIntruso';
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
      <TrovaLIntruso />
    </MemoryRouter>,
  );
}

/**
 * Smoke test: il generatore `makeOddOneOutRound` è già coperto a fondo in
 * `tests/core/games/oddOneOut.test.ts` — qui si verifica solo che il
 * componente monti, mostri il prompt e la griglia 2x2, e che il pattern
 * round si comporti come atteso. Non si può prevedere quale bottone sia
 * l'intruso senza iniettare un rng deterministico nel componente, quindi si
 * ritenta finche' non si trova la risposta giusta (round non avanza sulle
 * sbagliate) — al massimo 3 tentativi su 4 bottoni.
 */
describe('TrovaLIntruso (smoke)', () => {
  test('mostra il prompt e una griglia di 4 bottoni-emoji', () => {
    renderGame();

    expect(screen.getByText("Chi non c'entra?")).toBeInTheDocument();
    expect(optionButtons()).toHaveLength(4);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });

  test('la risposta giusta fa avanzare di una stella, le sbagliate no', () => {
    vi.useFakeTimers();
    renderGame();

    const buttons = optionButtons();
    let advanced = false;
    for (const btn of buttons) {
      fireEvent.click(btn);
      if (screen.queryByLabelText('1 round su 5 completati')) {
        advanced = true;
        break;
      }
      act(() => {
        vi.advanceTimersByTime(700);
      });
      if (screen.queryByLabelText('1 round su 5 completati')) {
        advanced = true;
        break;
      }
      // Risposta sbagliata: round ancora a 0, si passa al prossimo bottone.
      expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
    }

    expect(advanced).toBe(true);
  });
});
