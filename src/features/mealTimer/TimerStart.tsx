import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../app/store';
import { Button } from '../../ui/Button';
import { audioManager } from '../../ui/audio';
import { useReducedMotionPref } from '../../ui/motion';
import type { TimerKind } from '../../core/catalog/types';
import { TIMER_KINDS, TIMER_KIND_ORDER } from './timerKinds';

const MIN_DURATION = 1;
const MAX_DURATION = 90;
const STEP = 5;
const COUNTDOWN_STEP_MS = 700;
const COUNTDOWN_STEPS = 3; // "3-2-1"

function isTimerKind(v: string | null): v is TimerKind {
  return (TIMER_KIND_ORDER as string[]).includes(v ?? '');
}

/** Prima delle 16:00 → pranzo, altrimenti cena (FR-6): euristica semplice
 * sull'ora locale, usata solo per i due preset pasto storici — gli altri
 * preset (vestirsi/riordino/libero) si scelgono sempre esplicitamente. */
function defaultMealForNow(now: Date): TimerKind {
  return now.getHours() < 16 ? 'pranzo' : 'cena';
}

/** Durata di default per un kind: pranzo/cena leggono da `settings.meals`
 * (comportamento invariato), gli altri preset da `TIMER_KINDS`. */
function defaultDurationFor(kind: TimerKind, meals: { lunchMinutes: number; dinnerMinutes: number }): number {
  if (kind === 'pranzo') return meals.lunchMinutes;
  if (kind === 'cena') return meals.dinnerMinutes;
  return TIMER_KINDS[kind].defaultMinutes;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampDuration(v: number): number {
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, v));
}

/**
 * Countdown 3-2-1 (§FR-6) ricalcolato SEMPRE da `Date.now()` rispetto
 * all'istante di partenza — stesso principio "mai un contatore incrementale"
 * di `useTimerLoop` (§8.1). E' l'unico modo perche' regga anche un salto di
 * clock enorme (es. `page.clock.fastForward`, o l'app tornata in primo
 * piano dopo minuti): una singola invocazione del frame, qualunque essa
 * sia, ricalcola quanti "step" sono passati e — se il countdown e' finito —
 * dispaccia `onDone` una volta sola, senza bisogno che ogni step intermedio
 * abbia la sua occasione di essere eseguito.
 */
function useCountdown(startedAt: number | null, onDone: () => void): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const dispatchedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (startedAt === null) {
      setDisplay(null);
      return undefined;
    }
    const start = startedAt;
    dispatchedRef.current = false;
    let rafId: number;

    function frame() {
      const elapsedSteps = Math.floor((Date.now() - start) / COUNTDOWN_STEP_MS);
      const remaining = COUNTDOWN_STEPS - elapsedSteps;
      if (remaining <= 0) {
        setDisplay(null);
        if (!dispatchedRef.current) {
          dispatchedRef.current = true;
          onDoneRef.current();
        }
        return;
      }
      setDisplay(remaining);
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [startedAt]);

  return display;
}

/**
 * Schermata di avvio del timer pasto (FR-6, per l'adulto): scelta
 * pranzo/cena (preselezionata da `?pasto=` o dall'ora corrente), durata
 * regolabile SOLO per questa sessione — non scrive mai in `settings.meals`
 * (E3, vive nella sessione) — toggle suoni (l'unico controllo che scrive
 * davvero nei settings), e countdown giocoso 3-2-1 prima di dispacciare
 * `START` verso lo store.
 */
export function TimerStart() {
  const [searchParams] = useSearchParams();
  const meals = useApp((s) => s.settings.meals);
  const updateSettings = useApp((s) => s.updateSettings);
  const timerDispatch = useApp((s) => s.timerDispatch);
  const reducedMotion = useReducedMotionPref();

  const queryMeal = searchParams.get('pasto');
  const [meal, setMeal] = useState<TimerKind>(() =>
    isTimerKind(queryMeal) ? queryMeal : defaultMealForNow(new Date()),
  );
  const [durationMin, setDurationMin] = useState(() => defaultDurationFor(meal, meals));
  const [countdownStartedAt, setCountdownStartedAt] = useState<number | null>(null);
  const [editingDuration, setEditingDuration] = useState(false);
  const [draftDuration, setDraftDuration] = useState('');

  const countdown = useCountdown(countdownStartedAt, () => {
    timerDispatch({ type: 'START', meal, durationMs: durationMin * 60_000, dateISO: todayISO() });
  });

  function selectMeal(next: TimerKind) {
    setMeal(next);
    setDurationMin(defaultDurationFor(next, meals));
  }

  function adjustDuration(delta: number) {
    setDurationMin((d) => clampDuration(d + delta));
  }

  /**
   * Inserimento manuale da tastiera (accanto agli stepper +/-, oltre ad
   * essi): apre un campo numerico precompilato col valore corrente. Invio o
   * blur confermano (passando SEMPRE per `clampDuration`, 1-90 min), Esc o
   * il bottone ✕ annullano senza toccare `durationMin`. Come gli stepper,
   * il risultato vive solo in questo stato di sessione — mai in
   * `settings.meals` (E3).
   */
  function openDurationEdit() {
    setDraftDuration(String(durationMin));
    setEditingDuration(true);
  }

  function commitDurationEdit() {
    const parsed = Number(draftDuration);
    if (Number.isFinite(parsed)) {
      setDurationMin(clampDuration(Math.round(parsed)));
    }
    setEditingDuration(false);
  }

  function cancelDurationEdit() {
    setEditingDuration(false);
  }

  function handleDurationKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDurationEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDurationEdit();
    }
  }

  function toggleSounds() {
    updateSettings({ meals: { soundsOn: !meals.soundsOn } });
  }

  function handleStart() {
    audioManager.unlock();
    setCountdownStartedAt(Date.now());
  }

  const showCountdown = countdownStartedAt !== null;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-8 bg-cream px-6 py-10 text-center lg:min-h-screen">
      {showCountdown ? (
        <div style={{ perspective: 800 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={countdown}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotateX: 90, scale: 1.4 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, rotateX: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotateX: -90, scale: 0.7 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.7 }}
              className="block font-display text-8xl text-deep"
            >
              {countdown}
            </motion.span>
          </AnimatePresence>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl text-deep">Che facciamo?</h1>

          <div className="flex flex-wrap justify-center gap-3">
            {TIMER_KIND_ORDER.map((kind) => (
              <Button
                key={kind}
                type="button"
                variant={meal === kind ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => selectMeal(kind)}
              >
                {TIMER_KINDS[kind].chip} {TIMER_KINDS[kind].emoji}
              </Button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="font-body text-sm font-semibold text-stone">Durata</span>
            {editingDuration ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  autoFocus
                  value={draftDuration}
                  onChange={(e) => setDraftDuration(e.target.value)}
                  onKeyDown={handleDurationKeyDown}
                  onBlur={commitDurationEdit}
                  aria-label="Durata in minuti"
                  className="w-20 rounded-full border-2 border-deep/20 bg-card px-3 py-1.5 text-center font-display text-xl text-deep"
                />
                <span className="font-body text-sm text-stone">min</span>
                <button
                  type="button"
                  aria-label="Annulla modifica durata"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancelDurationEdit}
                  className="font-body text-lg text-stone"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => adjustDuration(-STEP)}
                  aria-label="Riduci durata"
                >
                  −
                </Button>
                <span className="font-display text-2xl text-deep">{durationMin} min</span>
                <button
                  type="button"
                  aria-label="Modifica durata da tastiera"
                  onClick={openDurationEdit}
                  className="font-body text-lg text-stone hover:text-deep"
                >
                  ✏️
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => adjustDuration(STEP)}
                  aria-label="Aumenta durata"
                >
                  +
                </Button>
              </div>
            )}
          </div>

          <Button type="button" variant="ghost" onClick={toggleSounds}>
            {meals.soundsOn ? '🔔 Suoni attivi' : '🔕 Suoni disattivati'}
          </Button>

          <Button type="button" size="xl" onClick={handleStart}>
            {TIMER_KINDS[meal].startButton}
          </Button>
        </>
      )}
    </div>
  );
}
