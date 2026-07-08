import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeFormeGiuste } from '../../../src/features/games/LeFormeGiuste';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

const LABELS = ['CERCHIO', 'QUADRATO', 'TRIANGOLO', 'STELLA', 'CUORE', 'ROMBO'];

function renderGame() {
  return render(
    <MemoryRouter>
      <LeFormeGiuste />
    </MemoryRouter>,
  );
}

/** Il prompt "Trova il <LABEL>" contiene sempre esattamente una delle
 * etichette del pool di forme (§Task 3-4, come in ToccaIlColore.test.tsx). */
function findTargetLabel(container: HTMLElement): string {
  const promptEl = container.querySelector('p');
  const text = promptEl?.textContent ?? '';
  const label = LABELS.find((l) => text.includes(l));
  if (!label) throw new Error(`Nessuna label di forma trovata nel prompt: "${text}"`);
  return label;
}

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Smoke test: il generatore `makeShapeRound` è già coperto a fondo in
 * `tests/core/games/shapeRound.test.ts` e il pattern round è identico a
 * `ToccaIlColore` — qui si verifica solo che il componente monti, mostri il
 * prompt e la forma target grande, e che una risposta giusta/sbagliata si
 * comporti come atteso.
 */
describe('LeFormeGiuste (smoke)', () => {
  test('mostra la forma target grande, il prompt e 3 bottoni-forma', () => {
    const { container } = renderGame();

    expect(findTargetLabel(container)).toEqual(expect.any(String));
    expect(container.querySelectorAll('svg')).toHaveLength(4); // 1 target + 3 opzioni
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });

  test('risposta giusta: +1 stella e dopo la pausa arriva il round successivo', () => {
    vi.useFakeTimers();
    const { container } = renderGame();
    const label = findTargetLabel(container);

    fireEvent.click(screen.getByRole('button', { name: label }));

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });

  test('risposta sbagliata: il round non avanza e si puo\' ritentare', () => {
    const { container } = renderGame();
    const label = findTargetLabel(container);
    const wrongButton = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('aria-label') !== label);
    expect(wrongButton).toBeDefined();

    fireEvent.click(wrongButton!);

    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
    expect(findTargetLabel(container)).toBe(label);

    fireEvent.click(screen.getByRole('button', { name: label }));
  });
});
