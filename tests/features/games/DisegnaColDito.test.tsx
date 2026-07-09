import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DisegnaColDito } from '../../../src/features/games/DisegnaColDito';

// jsdom non implementa il 2D context del canvas: si mocka getContext con un
// oggetto che espone solo i metodi/proprietà usati dal componente
// (setTransform/beginPath/moveTo/lineTo/stroke/clearRect + i settabili
// lineCap/lineJoin/lineWidth/strokeStyle), pattern standard per testare
// componenti canvas sotto jsdom (v. GameShell.test.tsx per il mock analogo
// di canvas-confetti).
const fakeCtx = {
  setTransform: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  lineCap: '',
  lineJoin: '',
  lineWidth: 0,
  strokeStyle: '',
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderGame() {
  return render(
    <MemoryRouter>
      <DisegnaColDito />
    </MemoryRouter>,
  );
}

describe('DisegnaColDito', () => {
  test('mostra il canvas e la tavolozza con 7 controlli (6 colori + gomma)', () => {
    renderGame();

    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();

    const paletteButtons = screen.getAllByRole('button', {
      name: /rosso|blu|giallo|verde|viola|marrone|gomma/i,
    });
    expect(paletteButtons).toHaveLength(7);
  });

  test('nessuna riga di stelle: è un gioco libero (totalRounds 0)', () => {
    renderGame();
    expect(screen.queryByRole('img', { name: /round su/i })).not.toBeInTheDocument();
  });

  test('selezionare un colore e poi "Ricomincia" non crasha', () => {
    renderGame();

    fireEvent.click(screen.getByRole('button', { name: 'BLU' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gomma' }));
    fireEvent.click(screen.getByRole('button', { name: /ricomincia/i }));

    expect(fakeCtx.clearRect).toHaveBeenCalled();
  });
});
