import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamesPage } from '../../../src/features/games/GamesPage';
import type { GameDef } from '../../../src/features/games/registry';

// Il registro reale è vuoto (Task 2: solo infrastruttura, i giochi arrivano
// nei Task 3-6) — per testare griglia/routing qui si mocka `GAMES` con due
// voci finte, ciascuna con un componente marcatore riconoscibile.
function FakeGioco1() {
  return <p>Contenuto del gioco 1</p>;
}
function FakeGioco2() {
  return <p>Contenuto del gioco 2</p>;
}

const FAKE_GAMES: GameDef[] = [
  { id: 'gioco-1', title: 'Gioco Uno', emoji: '🐸', skill: 'Allena: la memoria', Component: FakeGioco1 },
  { id: 'gioco-2', title: 'Gioco Due', emoji: '🐝', skill: 'Allena: i colori', Component: FakeGioco2 },
];

vi.mock('../../../src/features/games/registry', () => ({
  get GAMES() {
    return FAKE_GAMES;
  },
}));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/giochi/:gameId?" element={<GamesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GamesPage — griglia (nessun gameId)', () => {
  test('mostra intestazione e una card per ogni gioco del registro', () => {
    renderAt('/giochi');

    expect(screen.getByText('Giochi 🎲')).toBeInTheDocument();
    expect(screen.getByText('Piccoli giochi da fare insieme, un po\' alla volta')).toBeInTheDocument();
    expect(screen.getAllByTestId('game-item')).toHaveLength(FAKE_GAMES.length);
    expect(screen.getByText('Gioco Uno')).toBeInTheDocument();
    expect(screen.getByText('Gioco Due')).toBeInTheDocument();
  });

  test('cliccare una card naviga al gioco corrispondente', async () => {
    const user = userEvent.setup();
    renderAt('/giochi');

    await user.click(screen.getByText('Gioco Uno'));

    expect(await screen.findByText('Contenuto del gioco 1')).toBeInTheDocument();
  });
});

describe('GamesPage — con gameId', () => {
  test('gameId valido monta il componente del gioco', () => {
    renderAt('/giochi/gioco-2');

    expect(screen.getByText('Contenuto del gioco 2')).toBeInTheDocument();
  });

  test('gameId sconosciuto reindirizza alla griglia', () => {
    renderAt('/giochi/non-esiste');

    expect(screen.getByText('Giochi 🎲')).toBeInTheDocument();
    expect(screen.queryByText('Contenuto del gioco 1')).not.toBeInTheDocument();
  });
});
