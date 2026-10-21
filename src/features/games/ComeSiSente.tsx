import { motion } from 'framer-motion';
import { makeEmotionRound, type Emotion } from '../../core/games/emotionRound';
import type { ChoiceRound } from '../../core/games/types';
import { GameShell } from './GameShell';
import { useChoiceRounds } from './useChoiceRounds';

const TOTAL_ROUNDS = 5;

function rollRound(previous: ChoiceRound<Emotion> | null): ChoiceRound<Emotion> {
  let round = makeEmotionRound(Math.random);
  for (let i = 0; i < 5 && previous && round.target.id === previous.target.id; i++) {
    round = makeEmotionRound(Math.random);
  }
  return round;
}

/**
 * Gioco "Come si sente?": tre facce, si tocca quella dell'emozione chiesta.
 * Dare un nome alle emozioni è uno dei traguardi dei 3-5 anni: è la base per
 * riconoscerle in sé e negli altri (e per parlarne a casa).
 */
export function ComeSiSente() {
  const { round, locked, answer, wiggle, shell } = useChoiceRounds(rollRound, TOTAL_ROUNDS);

  return (
    <GameShell
      title="Come si sente?"
      prompt={`Tocca la faccia ${round.target.label}`}
      emoji="😊"
      {...shell}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">
          Tocca la faccia <span className="font-display font-bold">{round.target.label}</span>
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          {round.options.map((emotion) => (
            <motion.button
              key={emotion.id}
              type="button"
              disabled={locked}
              aria-label={emotion.label}
              onClick={() => answer(emotion.id, emotion.id === round.target.id)}
              {...wiggle(emotion.id)}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-card text-6xl shadow-soft disabled:opacity-60"
            >
              <span aria-hidden="true">{emotion.emoji}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
