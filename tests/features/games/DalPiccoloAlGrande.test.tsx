import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DalPiccoloAlGrande } from '../../../src/features/games/DalPiccoloAlGrande';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Smoke test della logica di stato piu' delicata rispetto agli altri giochi a
 * scelta: `makeOrderRound` e' gia' coperto in `tests/core/games/orderRound.ts`,
 * qui si verifica la macchina del componente — le 3 scale sono sempre distinte
 * (fasce disgiunte), quindi gli `aria-label` "piccolo"/"medio"/"grande" sono
 * univoci e permettono di guidare il gioco senza conoscere le scale esatte.
 */
describe('DalPiccoloAlGrande (smoke)', () => {
  test('mostra il prompt e 3 bottoni (piccolo/medio/grande)', () => {
    renderGame();

    expect(screen.getByText(/Tocca dal più/)).toBeInTheDocument();
    expect(screen.getByLabelText('piccolo')).toBeInTheDocument();
    expect(screen.getByLabelText('medio')).toBeInTheDocument();
    expect(screen.getByLabelText('grande')).toBeInTheDocument();
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });

  test('sequenza crescente completa (piccolo→medio→grande) fa avanzare di una stella', () => {
    vi.useFakeTimers();
    renderGame();

    fireEvent.click(screen.getByLabelText('piccolo'));
    fireEvent.click(screen.getByLabelText('medio'));
    fireEvent.click(screen.getByLabelText('grande'));
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });

  test('tocco sbagliato a metà sequenza: i bottoni accesi si spengono, il round non regredisce', () => {
    renderGame();

    // Primo tocco corretto: "piccolo" si accende e si disabilita.
    fireEvent.click(screen.getByLabelText('piccolo'));
    expect(screen.getByLabelText('piccolo')).toBeDisabled();

    // Tocco sbagliato (atteso "medio", tocco "grande"): azzera il progresso
    // del round — "piccolo" torna spento/abilitato — senza avanzare stelle.
    fireEvent.click(screen.getByLabelText('grande'));

    expect(screen.getByLabelText('piccolo')).toBeEnabled();
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });
});

function renderGame() {
  return render(
    <MemoryRouter>
      <DalPiccoloAlGrande />
    </MemoryRouter>,
  );
}
