import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useReducedMotionPref } from '../../ui/motion';
import { makeOrderRound, type OrderRound } from '../../core/games/orderRound';
import { GameShell } from './GameShell';
import { celebrateRound } from './feedback';

const TOTAL_ROUNDS = 5;
/** Pausa dopo un round vinto prima del successivo (§Task 5). */
const NEXT_ROUND_DELAY_MS = 600;
/** Tentativi massimi per l'anti-ripetizione del round (§Task 3). */
const MAX_REROLL_ATTEMPTS = 5;

function rollRound(previous: OrderRound | null): OrderRound {
  let round = makeOrderRound(Math.random);
  let attempts = 0;
  while (previous && round.emoji === previous.emoji && attempts < MAX_REROLL_ATTEMPTS) {
    round = makeOrderRound(Math.random);
    attempts++;
  }
  return round;
}

/** Rango di una scala tra le tre del round: usato solo per l'`aria-label`
 * ("piccolo"/"medio"/"grande"), stesso schema di `GrandeEPiccolo.tsx`. */
function rankLabel(scale: number, scales: number[]): 'piccolo' | 'medio' | 'grande' {
  const sorted = [...scales].sort((a, b) => a - b);
  if (scale === sorted[0]) return 'piccolo';
  if (scale === sorted[2]) return 'grande';
  return 'medio';
}

/**
 * Gioco "Dal più piccolo al più grande" (Task 5): come "Grande e piccolo" ma
 * con più stato — bisogna toccare i 3 bottoni in ordine crescente di scala;
 * ogni tocco giusto "accende" quel bottone (numerino di posizione) e lo
 * disabilita, un tocco sbagliato azzera solo il progresso del round in
 * corso (i già-accesi si spengono) senza far ripartire il round da zero.
 */
export function DalPiccoloAlGrande() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();

  const [round, setRound] = useState<OrderRound>(() => rollRound(null));
  const [completedRounds, setCompletedRounds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [chosenOrder, setChosenOrder] = useState<number[]>([]);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  function handleRestart() {
    setRound(rollRound(null));
    setCompletedRounds(0);
    setFinished(false);
    setChosenOrder([]);
    setWrongIndex(null);
    setLocked(false);
  }

  function handleTap(index: number) {
    if (locked || chosenOrder.includes(index)) return;

    const sortedScales = [...round.scales].sort((a, b) => a - b);
    const expectedScale = sortedScales[chosenOrder.length];

    if (round.scales[index] === expectedScale) {
      const nextChosen = [...chosenOrder, index];
      setChosenOrder(nextChosen);

      if (nextChosen.length === round.scales.length) {
        celebrateRound(soundsOn);
        setLocked(true);
        const nextCompleted = completedRounds + 1;
        setTimeout(() => {
          setCompletedRounds(nextCompleted);
          if (nextCompleted >= TOTAL_ROUNDS) {
            setFinished(true);
          } else {
            setRound((prev) => rollRound(prev));
            setChosenOrder([]);
          }
          setLocked(false);
        }, NEXT_ROUND_DELAY_MS);
      }
      return;
    }

    // Tocco sbagliato: wiggle sul bottone toccato, si azzera SOLO il
    // progresso del round corrente (i già-accesi si spengono) — si riprova
    // senza cambiare round.
    setWrongIndex(index);
    setChosenOrder([]);
  }

  return (
    <GameShell
      title="Dal più piccolo al più grande"
      prompt="Tocca dal più piccolo al più grande"
      emoji="📏"
      totalRounds={TOTAL_ROUNDS}
      completedRounds={completedRounds}
      finished={finished}
      onRestart={handleRestart}
    >
      <div className="flex flex-col items-center gap-8 py-6">
        <p className="text-center font-body text-xl text-deep">
          Tocca dal più <span className="font-display font-bold">PICCOLO</span> al più{' '}
          <span className="font-display font-bold">GRANDE</span>
        </p>

        <div className="flex flex-wrap items-end justify-center gap-6">
          {round.scales.map((scale, index) => {
            const position = chosenOrder.indexOf(index);
            const isLit = position !== -1;
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <span className="h-6 font-display text-lg font-bold text-deep">
                  {isLit ? position + 1 : ''}
                </span>
                <motion.button
                  type="button"
                  disabled={locked || isLit}
                  aria-label={rankLabel(scale, round.scales)}
                  onClick={() => handleTap(index)}
                  animate={
                    wrongIndex === index && !reducedMotion ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }
                  }
                  transition={{ duration: 0.4 }}
                  onAnimationComplete={() => {
                    if (wrongIndex === index) setWrongIndex(null);
                  }}
                  className={`flex min-h-16 min-w-16 items-center justify-center rounded-2xl border-4 ${
                    isLit ? 'border-aqua' : 'border-transparent'
                  }`}
                >
                  <span style={{ fontSize: 64 * scale }}>{round.emoji}</span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
