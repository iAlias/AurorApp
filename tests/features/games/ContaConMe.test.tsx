import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContaConMe } from '../../../src/features/games/ContaConMe';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Smoke test: il generatore `makeCountRound` è già coperto a fondo in
 * `tests/core/games/countRound.test.ts` e il pattern round è identico a
 * `ToccaIlColore` (già testato in dettaglio) — qui si verifica solo che il
 * componente monti, mostri il prompt e che una risposta giusta faccia
 * avanzare la stella.
 */
describe('ContaConMe (smoke)', () => {
  test('mostra il prompt "Quanti sono?" e 3 opzioni numeriche', () => {
    render(
      <MemoryRouter>
        <ContaConMe />
      </MemoryRouter>,
    );

    expect(screen.getByText('Quanti sono?')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });

  test('risposta giusta fa avanzare di una stella', () => {
    vi.useFakeTimers();
    const { container } = render(
      <MemoryRouter>
        <ContaConMe />
      </MemoryRouter>,
    );

    const emojiCount = container.querySelectorAll('[aria-hidden="true"] > span').length;
    const correctButton = screen.getByRole('button', { name: `${emojiCount}` });

    fireEvent.click(correctButton);
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });
});
