import { motion } from 'framer-motion';
import { makeHabitatRound, type HabitatRound } from '../../core/games/habitatRound';
import { GameShell } from './GameShell';
import { useChoiceRounds } from './useChoiceRounds';

const TOTAL_ROUNDS = 5;

function rollRound(previous: HabitatRound | null): HabitatRound {
  let round = makeHabitatRound(Math.random);
  for (let i = 0; i < 5 && previous && round.animal === previous.animal; i++) {
    round = makeHabitatRound(Math.random);
  }
  return round;
}

/**
 * Gioco "Chi vive qui?": un animale e tre case (mare, fattoria, bosco) — si
 * tocca la sua. Allena la classificazione e il lessico degli ambienti.
 */
export function ChiViveQui() {
  const { round, locked, answer, wiggle, shell } = useChoiceRounds(rollRound, TOTAL_ROUNDS);
  const prompt = `Dove vive ${round.animal.name}?`;

  return (
    <GameShell title="Chi vive qui?" prompt={prompt} emoji="🏡" {...shell}>
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">{prompt}</p>
        <span className="text-8xl" role="img" aria-label={round.animal.name}>
          {round.animal.emoji}
        </span>

        <div className="flex flex-wrap justify-center gap-4">
          {round.options.map((home) => (
            <motion.button
              key={home.id}
              type="button"
              disabled={locked}
              aria-label={home.label}
              onClick={() => answer(home.id, home.id === round.animal.home)}
              {...wiggle(home.id)}
              className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-card bg-card shadow-soft disabled:opacity-60"
            >
              <span className="text-5xl" aria-hidden="true">
                {home.emoji}
              </span>
              <span className="font-display text-xs font-bold text-deep" aria-hidden="true">
                {home.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
