import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GrandeEPiccolo } from '../../../src/features/games/GrandeEPiccolo';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Smoke test: il generatore `makeSizeRound` è già coperto a fondo in
 * `tests/core/games/sizeRound.test.ts` e il pattern round è identico agli
 * altri giochi a scelta — qui si verifica solo che il componente monti,
 * mostri il prompt corretto e che rispondere in base al rango (via
 * `aria-label` "grande"/"medio"/"piccolo") si comporti come atteso.
 */
describe('GrandeEPiccolo (smoke)', () => {
  test('mostra il prompt e 3 bottoni con la stessa emoji a scale diverse', () => {
    renderGame();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();

    const prompt = screen.getByText(/Tocca il più/);
    expect(prompt.textContent).toMatch(/GRANDE|PICCOLO/);
  });

  test('risposta giusta (in base al prompt) fa avanzare di una stella', () => {
    vi.useFakeTimers();
    renderGame();

    const prompt = screen.getByText(/Tocca il più/);
    const wantsBiggest = prompt.textContent?.includes('GRANDE');
    const targetLabel = wantsBiggest ? 'grande' : 'piccolo';

    fireEvent.click(screen.getByRole('button', { name: targetLabel }));
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });

  test('risposta sbagliata: il round non avanza', () => {
    renderGame();

    const prompt = screen.getByText(/Tocca il più/);
    const wantsBiggest = prompt.textContent?.includes('GRANDE');
    const wrongLabel = wantsBiggest ? 'piccolo' : 'grande';

    fireEvent.click(screen.getByRole('button', { name: wrongLabel }));

    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });
});

function renderGame() {
  return render(
    <MemoryRouter>
      <GrandeEPiccolo />
    </MemoryRouter>,
  );
}
