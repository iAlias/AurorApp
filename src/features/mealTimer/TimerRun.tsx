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
const TICK_INTERVAL_MS = 1000;

/** Ciclo del moltiplicatore di velocità demo/test (§FAST_FORWARD): 1x→2x→4x→8x→1x.
 * Stato locale ed effimero (non persistito): si resetta a 1x ogni volta che
 * `TimerRun` rimonta (un nuovo pasto = una nuova sessione = un nuovo mount). */
const SPEED_CYCLE = [1, 2, 4, 8] as const;
/** Passo dell'intervallo che dispaccia `FAST_FORWARD` mentre la velocità > 1x. */
const FAST_FORWARD_INTERVAL_MS = 200;

/** Formatta un tempo residuo in `mm:ss` (nessun nuovo calcolo di tempo: solo
 * formattazione di `remainingMs`, già derivato da `useTimerLoop`). */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

interface RingButtonProps {
  emoji: string;
  label: string;
  onLongPress: () => void;
  /** Etichetta breve mostrata sotto l'emoji (es. il moltiplicatore "2x"). */
  sublabel?: string;
}

/** Bottone di controllo adulto "a prova di bimba" (§8.3, child-lock): un
 * tap semplice non fa nulla, solo una pressione ferma di 3s attiva l'azione
 * — con un anello SVG di progresso attorno al dito mentre si tiene premuto. */
function RingButton({ emoji, label, onLongPress, sublabel }: RingButtonProps) {
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
      <span className="flex flex-col items-center leading-none" aria-hidden="true">
        <span className="text-2xl">{emoji}</span>
        {sublabel && (
          <span className="mt-0.5 font-display text-[11px] font-bold text-deep">{sublabel}</span>
        )}
      </span>
    </button>
  );
}

/** Nuvole soffuse decorative sullo sfondo (delight puro, §richiesta "più
 * bella"): nessun impatto sulla logica, solo transform/opacity, disattivate
 * (posizione statica) sotto `prefers-reduced-motion`. */
function BackgroundClouds({ reducedMotion }: { reducedMotion: boolean }) {
  interface CloudSpec {
    top: string;
    left?: string;
    right?: string;
    size: number;
    duration: number;
    delay: number;
  }
  const clouds: CloudSpec[] = [
    { top: '10%', left: '6%', size: 96, duration: 7, delay: 0 },
    { top: '16%', right: '8%', size: 72, duration: 9, delay: 1.2 },
    { top: '62%', left: '3%', size: 64, duration: 8, delay: 0.6 },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {clouds.map((c, i) =>
        reducedMotion ? (
          <div
            key={i}
            className="absolute rounded-full bg-white/60 blur-md"
            style={{ top: c.top, left: c.left, right: c.right, width: c.size, height: c.size * 0.6 }}
          />
        ) : (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/60 blur-md"
            style={{ top: c.top, left: c.left, right: c.right, width: c.size, height: c.size * 0.6 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: c.duration, repeat: Infinity, ease: 'easeInOut', delay: c.delay }}
          />
        ),
      )}
    </div>
  );
}

/**
 * Schermata "per la bimba" del timer pasto (FR-6), fullscreen nel proprio
 * sfondo/contenuto (la tab bar/sidebar di `Layout` resta visibile intorno):
 * conto alla rovescia mm:ss + arcobaleno/sole al centro (con nuvole soffuse e
 * bagliore decorativi), stelline al tocco (delight), controlli adulto
 * protetti da child-lock (long-press 3s) — pausa/riprendi, velocità
 * 2x/4x/8x (solo demo/test) ed esci — riga discreta "termina alle HH:mm" in
 * basso e il bottone "abbiamo già finito" ben visibile ma sempre a
 * pressione lunga.
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
  // Moltiplicatore di velocità demo/test, ciclico 1x→2x→4x→8x→1x: stato
  // locale effimero, mai persistito (si resetta a 1x a ogni mount/riavvio).
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEED_CYCLE[speedIndex];
  const nextSpeed = SPEED_CYCLE[(speedIndex + 1) % SPEED_CYCLE.length];

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

  // Ticchettio discreto mentre il timer corre davvero (mai durante il
  // countdown 3-2-1, che vive in TimerStart e non passa mai da qui): parte
  // solo se `running` e si ferma da solo in pausa o allo smontaggio, senza
  // lasciare intervalli orfani (stesso stile di cleanup di `useLongPress`).
  useEffect(() => {
    if (session.status !== 'running' || !meals.soundsOn) return undefined;
    const id = setInterval(() => {
      audioManager.play('tick');
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session.status, meals.soundsOn]);

  // Accelerazione demo/test (velocità 2x/4x/8x): NIENTE secondo orologio
  // parallelo — ogni tick sposta `startedAt` indietro tramite l'evento puro
  // `FAST_FORWARD` della macchina a stati (§core/timer/timerMachine), cosi'
  // che `progress`/`remainingMs` (sempre ricalcolati da `Date.now()` in
  // `useTimerLoop`) risultino gia' più avanti da soli. Attivo solo quando
  // `running` e velocità > 1x; ripulito allo stesso modo del ticchettio sopra.
  useEffect(() => {
    if (session.status !== 'running' || speed <= 1) return undefined;
    const id = setInterval(() => {
      timerDispatch({ type: 'FAST_FORWARD', ms: FAST_FORWARD_INTERVAL_MS * (speed - 1) });
    }, FAST_FORWARD_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session.status, speed, timerDispatch]);

  function handlePauseToggle() {
    timerDispatch({ type: session.status === 'running' ? 'PAUSE' : 'RESUME' });
  }

  function confirmExitNow() {
    setConfirmExit(false);
    timerDispatch({ type: 'EXIT' });
    onExit();
  }

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden bg-gradient-to-b from-cream via-sky/30 to-sky lg:min-h-screen">
      <TouchStars className="absolute inset-0" />
      <BackgroundClouds reducedMotion={reducedMotion} />

      {almostDone && (
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-0 z-20 border-8 border-sun/70',
            reducedMotion ? '' : 'animate-pulse',
          ].join(' ')}
        />
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 py-6">
        {/* Badge di pausa e conto alla rovescia condividono lo stesso spazio
            in flusso normale (mai `absolute` uno sull'altro): non possono
            quindi mai sovrapporsi visivamente. */}
        <div className="flex flex-col items-center gap-2 pt-2">
          {session.status === 'paused' && (
            <div className="rounded-full bg-card/90 px-4 py-2 font-body text-sm font-semibold text-stone shadow-soft">
              ☁️ In pausa
            </div>
          )}
          <p
            className="font-display text-4xl tabular-nums text-deep drop-shadow-sm sm:text-5xl"
            aria-label={`Tempo rimanente ${formatCountdown(remainingMs)}`}
          >
            {formatCountdown(remainingMs)}
          </p>
        </div>

        <div className="relative flex w-full flex-1 items-center justify-center">
          {/* Bagliore soffuso dietro l'arcobaleno: solo opacità, statico sotto reduced-motion. */}
          {reducedMotion ? (
            <div
              aria-hidden="true"
              className="absolute h-64 w-64 rounded-full bg-sun/20 blur-3xl sm:h-80 sm:w-80"
            />
          ) : (
            <motion.div
              aria-hidden="true"
              className="absolute h-64 w-64 rounded-full bg-sun/20 blur-3xl sm:h-80 sm:w-80"
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {reducedMotion ? (
            <div className="relative w-full max-w-xl">
              <Rainbow progress={progress} className="w-full" />
            </div>
          ) : (
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-xl"
            >
              <Rainbow progress={progress} className="w-full" />
            </motion.div>
          )}

          {arcStars.map((key) => (
            <motion.span
              key={key}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 0.6, y: 0 }}
              animate={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.6, y: -60 }}
              transition={{ duration: reducedMotion ? 0.4 : 0.9 }}
              onAnimationComplete={() => setArcStars((prev) => prev.filter((k) => k !== key))}
              className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-4xl"
              aria-hidden="true"
            >
              ⭐
            </motion.span>
          ))}
        </div>
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
        <RingButton
          emoji="⏩"
          sublabel={`${speed}x`}
          label={`Velocità ${speed}×: tieni premuto per passare a ${nextSpeed}× (solo per test/demo)`}
          onLongPress={() => setSpeedIndex((i) => (i + 1) % SPEED_CYCLE.length)}
        />
        <RingButton emoji="✕" label="Esci" onLongPress={() => setConfirmExit(true)} />
      </div>

      <button
        type="button"
        aria-label="Abbiamo già finito"
        className="relative z-10 mb-6 flex items-center gap-2 self-center overflow-hidden rounded-full border-2 border-coral/60 bg-card px-6 py-3 font-display text-sm font-bold text-coral shadow-soft active:scale-[.98]"
        {...finishEarlyLongPress.handlers}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 origin-left bg-coral/25"
          style={{ transform: `scaleX(${finishEarlyLongPress.progress})` }}
        />
        <span className="relative text-lg" aria-hidden="true">
          🏁
        </span>
        <span className="relative">tieni premuto: abbiamo già finito</span>
      </button>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Uscire dal timer?">
        <p className="mb-4 font-body text-stone">Il tempo andrà perso e si ricomincia da capo.</p>
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
