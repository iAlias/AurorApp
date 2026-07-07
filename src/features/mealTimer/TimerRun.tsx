import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Rainbow } from '../../ui/Rainbow';
import { audioManager } from '../../ui/audio';
import { useReducedMotionPref } from '../../ui/motion';
import { useLongPress } from '../../ui/useLongPress';
import { endTimeLabel } from '../../core/timer/progress';
import type { TimerSession } from '../../core/catalog/types';
import { TouchStars } from './TouchStars';
import { useTimerLoop } from './useTimerLoop';
import { useWakeLock } from './useWakeLock';

export interface TimerRunProps {
  session: TimerSession;
  onExit: () => void;
}

const ALMOST_DONE_MS = 5 * 60_000;
const LONG_PRESS_MS = 3000;
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RingButtonProps {
  emoji: string;
  label: string;
  onLongPress: () => void;
}

/** Bottone di controllo adulto "a prova di bimba" (§8.3, child-lock): un
 * tap semplice non fa nulla, solo una pressione ferma di 3s attiva l'azione
 * — con un anello SVG di progresso attorno al dito mentre si tiene premuto. */
function RingButton({ emoji, label, onLongPress }: RingButtonProps) {
  const { handlers, progress, pressing } = useLongPress(onLongPress, { ms: LONG_PRESS_MS });

  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex h-16 w-16 items-center justify-center rounded-full bg-card/90 shadow-soft"
      {...handlers}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="#E8E4DA" strokeWidth={4} />
        {pressing && (
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke="#4CC9F0"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            transform="rotate(-90 32 32)"
          />
        )}
      </svg>
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
    </button>
  );
}

/**
 * Schermata "per la bimba" del timer pasto (FR-6), fullscreen, niente
 * navigazione: arcobaleno + sole al centro, stelline al tocco (delight),
 * controlli adulto protetti da child-lock (long-press 3s), riga discreta
 * "termina alle HH:mm" in basso.
 */
export function TimerRun({ session, onExit }: TimerRunProps) {
  const timerDispatch = useApp((s) => s.timerDispatch);
  const meals = useApp((s) => s.settings.meals);
  const reducedMotion = useReducedMotionPref();
  const { progress, remainingMs } = useTimerLoop(session);
  const { supported: wakeLockSupported } = useWakeLock(session.status === 'running');
  const finishEarlyLongPress = useLongPress(() => timerDispatch({ type: 'FINISH_EARLY' }), {
    ms: LONG_PRESS_MS,
  });

  const [confirmExit, setConfirmExit] = useState(false);
  const [arcStars, setArcStars] = useState<number[]>([]);
  const lastArcRef = useRef(-1);
  const almostPlayedRef = useRef(false);
  const [almostDone, setAlmostDone] = useState(false);

  // Ogni arco completato (7 spicchi totali): stellina + suono campanellina.
  useEffect(() => {
    const currentArc = Math.floor(progress * 7);
    if (currentArc > lastArcRef.current && currentArc > 0 && currentArc <= 7) {
      lastArcRef.current = currentArc;
      if (meals.soundsOn) audioManager.play('arc');
      setArcStars((prev) => [...prev, Date.now()]);
    }
  }, [progress, meals.soundsOn]);

  // Ultimi 5 minuti: suono + pulsazione dolce del bordo, una volta sola.
  useEffect(() => {
    if (session.status === 'running' && remainingMs <= ALMOST_DONE_MS && !almostPlayedRef.current) {
      almostPlayedRef.current = true;
      setAlmostDone(true);
      if (meals.soundsOn) audioManager.play('almost');
    }
  }, [remainingMs, session.status, meals.soundsOn]);

  function handlePauseToggle() {
    timerDispatch({ type: session.status === 'running' ? 'PAUSE' : 'RESUME' });
  }

  function confirmExitNow() {
    setConfirmExit(false);
    timerDispatch({ type: 'EXIT' });
    onExit();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-cream to-sky">
      <TouchStars className="absolute inset-0" />

      {almostDone && (
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-0 z-20 border-8 border-sun/70',
            reducedMotion ? '' : 'animate-pulse',
          ].join(' ')}
        />
      )}

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        {reducedMotion ? (
          <div className="w-full max-w-xl">
            <Rainbow progress={progress} className="w-full" />
          </div>
        ) : (
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full max-w-xl"
          >
            <Rainbow progress={progress} className="w-full" />
          </motion.div>
        )}

        {arcStars.map((key) => (
          <motion.span
            key={key}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 1.6, y: -60 }}
            transition={{ duration: 0.9 }}
            onAnimationComplete={() => setArcStars((prev) => prev.filter((k) => k !== key))}
            className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-4xl"
            aria-hidden="true"
          >
            ⭐
          </motion.span>
        ))}

        {session.status === 'paused' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-4 py-2 font-body text-sm font-semibold text-stone shadow-soft">
            ☁️ In pausa
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2 pb-4">
        <p className="font-body text-sm text-stone">{endTimeLabel(session)}</p>
        {!wakeLockSupported && (
          <p className="font-body text-xs text-stone">
            💡 tieni il telefono in carica: lo schermo deve restare acceso
          </p>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-6 pb-6">
        <RingButton
          emoji={session.status === 'running' ? '⏸' : '▶'}
          label={session.status === 'running' ? 'Pausa' : 'Riprendi'}
          onLongPress={handlePauseToggle}
        />
        <RingButton emoji="✕" label="Esci" onLongPress={() => setConfirmExit(true)} />
      </div>

      <button
        type="button"
        aria-label="Abbiamo già finito"
        className="relative z-10 mb-6 self-center rounded-full bg-card/70 px-6 py-2 font-body text-xs font-semibold text-stone"
        {...finishEarlyLongPress.handlers}
      >
        ═ tieni premuto: abbiamo già finito ═
      </button>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Uscire dal timer?">
        <p className="mb-4 font-body text-stone">Il tempo di questo pasto andrà perso.</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setConfirmExit(false)}>
            Annulla
          </Button>
          <Button type="button" variant="danger" onClick={confirmExitNow}>
            Esci
          </Button>
        </div>
      </Modal>
    </div>
  );
}
