import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MemoriaDegliAnimali } from '../../../src/features/games/MemoriaDegliAnimali';
import { optionButtons } from './optionButtons';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocca burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

// Mazzo fisso con posizioni note (§Task 5): 0/2 e 1/3 e 4/5 sono le coppie,
// cosi' i test non dipendono dall'ordine casuale del vero generatore (gia'
// coperto a fondo in tests/core/games/memoryDeck.test.ts).
vi.mock('../../../src/core/games/memoryDeck', () => ({
  makeMemoryDeck: () => [
    { id: 0, emoji: '🐶' },
    { id: 1, emoji: '🐱' },
    { id: 2, emoji: '🐶' },
    { id: 3, emoji: '🐱' },
    { id: 4, emoji: '🐰' },
    { id: 5, emoji: '🐰' },
  ],
}));

afterEach(() => {
  vi.useRealTimers();
});

describe('MemoriaDegliAnimali', () => {
  test('mostra 6 carte coperte, nessuna coppia trovata', () => {
    renderGame();
    expect(optionButtons()).toHaveLength(6);
    expect(screen.getByLabelText('0 round su 3 completati')).toBeInTheDocument();
  });

  test('girare due carte uguali le lascia scoperte e incrementa le coppie', () => {
    renderGame();
    const cards = optionButtons();

    fireEvent.click(cards[0]); // 🐶
    fireEvent.click(cards[2]); // 🐶 — coppia

    expect(screen.getByLabelText('1 round su 3 completati')).toBeInTheDocument();
    expect(cards[0]).toBeDisabled();
    expect(cards[2]).toBeDisabled();
  });

  test('girare due carte diverse le richiude dopo ~900ms (le altre restano disabilitate nel frattempo)', () => {
    vi.useFakeTimers();
    renderGame();
    const cards = optionButtons();

    fireEvent.click(cards[0]); // 🐶
    fireEvent.click(cards[1]); // 🐱 — non coppia

    expect(screen.getByLabelText('0 round su 3 completati')).toBeInTheDocument();
    expect(cards[3]).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(cards[0]).not.toBeDisabled();
    expect(cards[1]).not.toBeDisabled();
  });

  test('trovare tutte e 3 le coppie finisce il gioco', () => {
    renderGame();
    const cards = optionButtons();

    fireEvent.click(cards[0]);
    fireEvent.click(cards[2]);
    fireEvent.click(cards[1]);
    fireEvent.click(cards[3]);
    fireEvent.click(cards[4]);
    fireEvent.click(cards[5]);

    expect(screen.getByText('Bravissima! 🎉')).toBeInTheDocument();
  });

  test('"Gioca ancora" rigenera il mazzo e azzera le coppie trovate', () => {
    renderGame();
    let cards = optionButtons();
    fireEvent.click(cards[0]);
    fireEvent.click(cards[2]);
    fireEvent.click(cards[1]);
    fireEvent.click(cards[3]);
    fireEvent.click(cards[4]);
    fireEvent.click(cards[5]);
    expect(screen.getByText('Bravissima! 🎉')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /gioca ancora/i }));

    expect(screen.queryByText('Bravissima! 🎉')).not.toBeInTheDocument();
    expect(screen.getByLabelText('0 round su 3 completati')).toBeInTheDocument();
    cards = optionButtons();
    expect(cards).toHaveLength(6);
    cards.forEach((card) => expect(card).not.toBeDisabled());
  });
});

function renderGame() {
  return render(
    <MemoryRouter>
      <MemoriaDegliAnimali />
    </MemoryRouter>,
  );
}
