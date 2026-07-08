import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { GAMES } from './registry';

/**
 * Sezione "Giochi" (Task 2, infrastruttura — i 10 giochi veri arrivano nei
 * Task 3-6, il registro qui è vuoto): senza `gameId` in URL mostra la
 * griglia di scelta (stile card coerente con `CatalogPage`); con un
 * `gameId` valido monta il componente del gioco; con uno sconosciuto
 * reindirizza alla griglia invece di mostrare una pagina rotta.
 */
export function GamesPage() {
  const { gameId } = useParams();

  if (!gameId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-8">
        <h1 className="font-display text-2xl text-deep">Giochi 🎲</h1>
        <p className="font-body text-sm text-stone">
          Piccoli giochi da fare insieme, un po' alla volta
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" data-testid="games-grid">
          {GAMES.map((game) => (
            <Link key={game.id} to={`/giochi/${game.id}`} data-testid="game-item">
              <Card className="flex h-full flex-col items-center gap-1 text-center">
                <span className="text-3xl" aria-hidden="true">
                  {game.emoji}
                </span>
                <span className="font-body text-sm font-semibold text-deep">{game.title}</span>
                <span className="font-body text-xs text-stone">{game.skill}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const def = GAMES.find((g) => g.id === gameId);
  if (!def) {
    return <Navigate to="/giochi" replace />;
  }

  const GameComponent = def.Component;
  return <GameComponent />;
}
