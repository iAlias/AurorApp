import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeMemoryDeck, type MemoryCard } from '../../core/games/memoryDeck';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

/** Coppie totali del mazzo (§Task 5): 6 carte = 3 coppie. */
const TOTAL_PAIRS = 3;
/** Pausa prima di richiudere due carte che non combaciano (§Task 5). */
const MISMATCH_DELAY_MS = 900;

/**
 * Gioco "Memoria degli animali" (Task 5): a differenza dei giochi a round
 * singolo (Task 3-4) qui lo stato non è "una scelta e via" ma il classico
 * memory — griglia 3x2, al massimo 2 carte girate alla volta, le coppie
 * trovate restano scoperte per sempre; solo le carte "diverse" si richiudono
 * dopo un breve ritardo (durante il quale tutta la griglia è disabilitata).
 */
export function MemoriaDegliAnimali() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [deck, setDeck] = useState<MemoryCard[]>(() => makeMemoryDeck(Math.random));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const pairsFound = matched.length / 2;

  function handleRestart() {
    setDeck(makeMemoryDeck(Math.random));
    setFlipped([]);
    setMatched([]);
    setLocked(false);
    setFinished(false);
  }

  function handleFlip(id: number) {
    if (locked || matched.includes(id) || flipped.includes(id)) return;

    if (flipped.length === 0) {
      setFlipped([id]);
      return;
    }

    // Seconda carta: confronta con la prima già girata.
    const firstId = flipped[0];
    const first = deck.find((c) => c.id === firstId);
    const second = deck.find((c) => c.id === id);

    if (first && second && first.emoji === second.emoji) {
      celebrateRound(soundsOn);
      const nextMatched = [...matched, firstId, id];
      setMatched(nextMatched);
      setFlipped([]);
      if (nextMatched.length / 2 >= TOTAL_PAIRS) {
        setFinished(true);
      }
      return;
    }

    // Non combaciano: restano visibili un attimo, poi si richiudono — nessun
    // suono, e tutta la griglia resta disabilitata per l'intera attesa.
    setFlipped([firstId, id]);
    setLocked(true);
    setTimeout(() => {
      setFlipped([]);
      setLocked(false);
    }, MISMATCH_DELAY_MS);
  }

  return (
    <GameShell
      title="Memoria degli animali"
      prompt="Trova le coppie di animali"
      emoji="🐾"
      totalRounds={TOTAL_PAIRS}
      completedRounds={pairsFound}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-6 py-6">
        <p className="text-center font-body text-xl text-deep">Trova le coppie di animali</p>

        <div className="grid grid-cols-3 gap-4">
          {deck.map((card) => {
            const isRevealed = flipped.includes(card.id) || matched.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                disabled={locked || matched.includes(card.id)}
                aria-label={isRevealed ? card.emoji : 'carta coperta'}
                onClick={() => handleFlip(card.id)}
                className={`flex h-[90px] w-[90px] items-center justify-center rounded-2xl shadow-soft disabled:cursor-default ${
                  isRevealed ? 'bg-card' : 'bg-sky/40'
                }`}
              >
                <motion.span
                  key={isRevealed ? 'front' : 'back'}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.25 }}
                  className="text-4xl"
                >
                  {isRevealed ? card.emoji : '🌟'}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
