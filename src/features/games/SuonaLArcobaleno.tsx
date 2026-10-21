import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { audioManager } from '../../ui/audio';
import { useReducedMotionPref } from '../../ui/motion';
import { GameShell } from './GameShell';

/** Scala di do maggiore, dal do centrale-alto al do dell'ottava sopra: un colore per nota. */
const BARS = [
  { note: 'DO', freq: 523.25, color: '#FF5D5D' },
  { note: 'RE', freq: 587.33, color: '#FF9A3D' },
  { note: 'MI', freq: 659.25, color: '#FFD166' },
  { note: 'FA', freq: 698.46, color: '#7BC950' },
  { note: 'SOL', freq: 783.99, color: '#4CC9C0' },
  { note: 'LA', freq: 880, color: '#5E7CE2' },
  { note: 'SI', freq: 987.77, color: '#9B5DE5' },
  { note: 'DO', freq: 1046.5, color: '#F49FBC' },
];

/**
 * Gioco libero "Suona l'arcobaleno": uno xilofono di 8 barre colorate, le
 * più corte suonano più acute come in quello vero. Nessun errore possibile:
 * si esplora il suono, si inventano melodie. Le note partono al tocco
 * (`pointerdown`), senza il ritardo del click, perché il suono deve arrivare
 * insieme al dito.
 */
export function SuonaLArcobaleno() {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const reducedMotion = useReducedMotionPref();
  const [lastHit, setLastHit] = useState<{ index: number; n: number } | null>(null);

  function hit(index: number) {
    if (soundsOn) audioManager.tone(BARS[index].freq);
    setLastHit((prev) => ({ index, n: (prev?.n ?? 0) + 1 }));
  }

  return (
    <GameShell
      title="Suona l'arcobaleno"
      prompt="Tocca i colori e suona!"
      emoji="🎶"
      totalRounds={0}
      completedRounds={0}
      finished={false}
      onRestart={() => setLastHit(null)}
    >
      {!soundsOn && (
        <p className="rounded-card bg-sun/20 px-4 py-2 text-center font-body text-sm text-deep">
          🔕 I suoni sono spenti: accendili nelle Impostazioni per sentire lo xilofono.
        </p>
      )}
      <div className="flex flex-col items-center gap-2 py-4">
        {BARS.map((bar, i) => (
          <motion.button
            // La chiave cambia a ogni colpo sulla barra: l'animazione riparte anche a tocchi ripetuti.
            key={lastHit?.index === i ? `${i}-${lastHit.n}` : i}
            type="button"
            aria-label={`Nota ${bar.note}`}
            onPointerDown={() => hit(i)}
            initial={lastHit?.index === i ? (reducedMotion ? { opacity: 0.6 } : { scale: 0.94 }) : false}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex h-12 items-center justify-center rounded-full font-display text-lg font-bold text-deep shadow-soft"
            style={{ backgroundColor: bar.color, width: `${100 - i * 5}%`, touchAction: 'manipulation' }}
          >
            {bar.note}
          </motion.button>
        ))}
      </div>
    </GameShell>
  );
}
