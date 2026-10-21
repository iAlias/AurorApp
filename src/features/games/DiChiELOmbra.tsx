import { motion } from 'framer-motion';
import { makeShadowRound, type ShadowItem } from '../../core/games/shadowRound';
import type { ChoiceRound } from '../../core/games/types';
import { GameShell } from './GameShell';
import { useChoiceRounds } from './useChoiceRounds';

const TOTAL_ROUNDS = 5;

function rollRound(previous: ChoiceRound<ShadowItem> | null): ChoiceRound<ShadowItem> {
  let round = makeShadowRound(Math.random);
  for (let i = 0; i < 5 && previous && round.target.id === previous.target.id; i++) {
    round = makeShadowRound(Math.random);
  }
  return round;
}

/**
 * Gioco "Di chi è l'ombra?": una sagoma tutta nera (la stessa emoji annerita
 * con un filtro CSS) e 3 figure colorate — si tocca quella che fa
 * quell'ombra. Allena l'osservazione delle forme, senza bisogno di leggere.
 */
export function DiChiELOmbra() {
  const { round, locked, answer, wiggle, shell } = useChoiceRounds(rollRound, TOTAL_ROUNDS);

  return (
    <GameShell title="Di chi è l'ombra?" prompt="Di chi è questa ombra?" emoji="👤" {...shell}>
      <div className="flex flex-col items-center gap-8 py-6">
        <div
          className="flex h-40 w-40 items-center justify-center rounded-full bg-sun/30 text-8xl"
          role="img"
          aria-label="Ombra misteriosa"
        >
          <span aria-hidden="true" style={{ filter: 'brightness(0)' }}>
            {round.target.emoji}
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              disabled={locked}
              aria-label={item.label}
              onClick={() => answer(item.id, item.id === round.target.id)}
              {...wiggle(item.id)}
              className="flex h-24 w-24 items-center justify-center rounded-card bg-card text-6xl shadow-soft disabled:opacity-60"
            >
              <span aria-hidden="true">{item.emoji}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
