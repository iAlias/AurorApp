import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToccaIlColore } from '../../../src/features/games/ToccaIlColore';
import { optionButtons } from './optionButtons';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

const LABELS = ['ROSSO', 'BLU', 'GIALLO', 'VERDE', 'ARANCIONE', 'VIOLA', 'ROSA', 'MARRONE'];

function renderGame() {
  return render(
    <MemoryRouter>
      <ToccaIlColore />
    </MemoryRouter>,
  );
}

/** Il prompt "Tocca il <LABEL>" contiene sempre esattamente una delle
 * etichette del pool: la si ricava leggendo il testo renderizzato, senza
 * bisogno di iniettare un rng deterministico nel componente (§Task 3). */
function findTargetLabel(container: HTMLElement): string {
  const promptEl = container.querySelector('p');
  const text = promptEl?.textContent ?? '';
  const label = LABELS.find((l) => text.includes(l));
  if (!label) throw new Error(`Nessuna label di colore trovata nel prompt: "${text}"`);
  return label;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToccaIlColore', () => {
  test('mostra il prompt e 4 cerchi colorati con touch target adeguato', () => {
    const { container } = renderGame();

    expect(findTargetLabel(container)).toEqual(expect.any(String));
    expect(optionButtons()).toHaveLength(4);
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
    const wrongButton = optionButtons()
      .find((btn) => btn.getAttribute('aria-label') !== label);
    expect(wrongButton).toBeDefined();

    fireEvent.click(wrongButton!);

    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
    expect(findTargetLabel(container)).toBe(label);

    // Si puo' ancora rispondere correttamente allo stesso round.
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
});
