import { next, type TimerEvent } from '../../../src/core/timer/timerMachine';
import {
  elapsedMs,
  progressOf,
  fillFraction,
  sunAngleDeg,
  endTimeLabel,
  restore,
} from '../../../src/core/timer/progress';
import type { TimerSession } from '../../../src/core/catalog/types';

const MIN = 60_000;

describe('timerMachine — next()', () => {
  test('START da null crea una sessione running con i campi attesi', () => {
    const t0 = 1_000_000;
    const s = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0);
    expect(s).toEqual<TimerSession>({
      meal: 'pranzo',
      dateISO: '2026-07-04',
      startedAt: t0,
      durationMs: 60 * MIN,
      pausedAt: null,
      pausedTotalMs: 0,
      status: 'running',
    });
  });

  test('PAUSE da running imposta pausedAt=now e status=paused, senza toccare pausedTotalMs', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'cena', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0);
    const paused = next(running, { type: 'PAUSE' }, t0 + 10 * MIN);
    expect(paused).toEqual({
      ...running,
      status: 'paused',
      pausedAt: t0 + 10 * MIN,
    });
  });

  test('pausa di 5 minuti congela il progress (nessun avanzamento durante la pausa)', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const pausedAtT = t0 + 10 * MIN;
    const paused = next(running, { type: 'PAUSE' }, pausedAtT)!;
    const progressAtPause = progressOf(paused, pausedAtT);
    // 5 minuti dopo, sempre in pausa: il progress non deve essere cambiato.
    const progress5MinLater = progressOf(paused, pausedAtT + 5 * MIN);
    expect(progress5MinLater).toBe(progressAtPause);
    expect(progressAtPause).toBeCloseTo(10 / 60, 5);
  });

  test('doppia PAUSE è un no-op: la seconda PAUSE ritorna la sessione invariata', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, t0 + 10 * MIN)!;
    const pausedAgain = next(paused, { type: 'PAUSE' }, t0 + 20 * MIN);
    expect(pausedAgain).toBe(paused); // stesso riferimento: evento non valido, invariato
  });

  test('RESUME accumula pausedTotalMs e riporta a running', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, t0 + 10 * MIN)!;
    const resumed = next(paused, { type: 'RESUME' }, t0 + 15 * MIN)!;
    expect(resumed).toEqual({
      ...running,
      status: 'running',
      pausedAt: null,
      pausedTotalMs: 5 * MIN,
    });
  });

  test('RESUME da running (non in pausa) è un no-op', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const stillRunning = next(running, { type: 'RESUME' }, t0 + 5 * MIN);
    expect(stillRunning).toBe(running);
  });

  test('elapsedMs con 2 pause sottrae correttamente entrambe le pause dal tempo trascorso', () => {
    const t0 = 0;
    let s = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    // corre 10 min
    s = next(s, { type: 'PAUSE' }, 10 * MIN)!; // prima pausa inizia a t=10min
    // pausa di 4 min
    s = next(s, { type: 'RESUME' }, 14 * MIN)!; // pausedTotalMs = 4min
    // corre altri 6 min (t=20min)
    s = next(s, { type: 'PAUSE' }, 20 * MIN)!; // seconda pausa inizia a t=20min
    // pausa di 3 min
    s = next(s, { type: 'RESUME' }, 23 * MIN)!; // pausedTotalMs = 4+3 = 7min

    // tempo trascorso "reale" a t=23min: 23 - 7(pause) = 16 min di corsa effettiva
    expect(elapsedMs(s, 23 * MIN)).toBe(16 * MIN);

    // altri 4 min di corsa dopo il secondo resume (t=27min): 20 min effettivi
    expect(elapsedMs(s, 27 * MIN)).toBe(20 * MIN);
  });

  test('elapsedMs durante una pausa in corso non conta il tempo dall\'inizio della pausa', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, 12 * MIN)!;
    expect(elapsedMs(paused, 12 * MIN)).toBe(12 * MIN);
    expect(elapsedMs(paused, 30 * MIN)).toBe(12 * MIN); // congelato
  });

  test('TICK con progress<1 non cambia stato (rimane running, invariato)', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const stillRunning = next(running, { type: 'TICK' }, 30 * MIN);
    expect(stillRunning).toBe(running);
  });

  test('TICK quando elapsed raggiunge durationMs passa a celebrating', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const celebrating = next(running, { type: 'TICK' }, 60 * MIN);
    expect(celebrating).toEqual({ ...running, status: 'celebrating' });
  });

  test('TICK su una sessione già paused non ha effetto (TICK valido solo da running)', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, 65 * MIN)!; // oltre durationMs ma in pausa
    const afterTick = next(paused, { type: 'TICK' }, 100 * MIN);
    expect(afterTick).toBe(paused);
  });

  test('FINISH_EARLY da running passa a celebrating', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const celebrating = next(running, { type: 'FINISH_EARLY' }, 20 * MIN);
    expect(celebrating).toEqual({ ...running, status: 'celebrating' });
  });

  test('FINISH_EARLY da paused chiude la pausa e passa a celebrating', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'cena', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, 10 * MIN)!;
    const celebrating = next(paused, { type: 'FINISH_EARLY' }, 25 * MIN);
    expect(celebrating).toEqual({
      ...running,
      status: 'celebrating',
      pausedAt: null,
      pausedTotalMs: 15 * MIN, // pausa chiusa: 25-10 min accumulati
    });
  });

  test('FINISH_EARLY su una sessione già done non ha effetto', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const celebrating = next(running, { type: 'FINISH_EARLY' }, 10 * MIN)!;
    const done = next(celebrating, { type: 'CELEBRATION_DONE' }, 12 * MIN)!;
    const afterFinishEarly = next(done, { type: 'FINISH_EARLY' }, 15 * MIN);
    expect(afterFinishEarly).toBe(done);
  });

  test('CELEBRATION_DONE da celebrating passa a done', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const celebrating = next(running, { type: 'FINISH_EARLY' }, 10 * MIN)!;
    const done = next(celebrating, { type: 'CELEBRATION_DONE' }, 12 * MIN);
    expect(done).toEqual({ ...celebrating, status: 'done' });
  });

  test('CELEBRATION_DONE da running (non celebrating) non ha effetto', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const unchanged = next(running, { type: 'CELEBRATION_DONE' }, 10 * MIN);
    expect(unchanged).toBe(running);
  });

  test('EXIT da qualunque stato riporta a null', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    expect(next(running, { type: 'EXIT' }, 10 * MIN)).toBeNull();
    const paused = next(running, { type: 'PAUSE' }, 10 * MIN)!;
    expect(next(paused, { type: 'EXIT' }, 15 * MIN)).toBeNull();
    expect(next(null, { type: 'EXIT' }, 20 * MIN)).toBeNull();
  });

  test('evento sconosciuto/non gestito su null ritorna null', () => {
    const e: TimerEvent = { type: 'PAUSE' };
    expect(next(null, e, 0)).toBeNull();
  });

  test('FAST_FORWARD da running sposta startedAt indietro di `ms`, senza toccare altri campi', () => {
    const t0 = 1_000_000;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const fastForwarded = next(running, { type: 'FAST_FORWARD', ms: 5000 }, t0 + 10_000);
    expect(fastForwarded).toEqual({ ...running, startedAt: t0 - 5000 });
  });

  test('FAST_FORWARD fa avanzare progressOf come se fosse trascorso più tempo reale', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const before = progressOf(running, 5 * MIN);
    const fastForwarded = next(running, { type: 'FAST_FORWARD', ms: 25 * MIN }, 5 * MIN)!;
    const after = progressOf(fastForwarded, 5 * MIN);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeCloseTo(30 / 60, 5);
  });

  test('FAST_FORWARD è un no-op da paused/celebrating/done/null', () => {
    const t0 = 0;
    const running = next(null, { type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' }, t0)!;
    const paused = next(running, { type: 'PAUSE' }, 10 * MIN)!;
    expect(next(paused, { type: 'FAST_FORWARD', ms: 1000 }, 20 * MIN)).toBe(paused);

    const celebrating = next(running, { type: 'FINISH_EARLY' }, 10 * MIN)!;
    expect(next(celebrating, { type: 'FAST_FORWARD', ms: 1000 }, 20 * MIN)).toBe(celebrating);

    const done = next(celebrating, { type: 'CELEBRATION_DONE' }, 12 * MIN)!;
    expect(next(done, { type: 'FAST_FORWARD', ms: 1000 }, 20 * MIN)).toBe(done);

    expect(next(null, { type: 'FAST_FORWARD', ms: 1000 }, 0)).toBeNull();
  });
});

describe('progress — elapsedMs / progressOf', () => {
  test('elapsedMs clampa a 0 se now < startedAt (non deve mai andare negativo)', () => {
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: 10_000, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    expect(elapsedMs(s, 0)).toBe(0);
  });

  test('progressOf è clampato a [0,1]', () => {
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: 0, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    expect(progressOf(s, 0)).toBe(0);
    expect(progressOf(s, 30 * MIN)).toBeCloseTo(0.5, 5);
    expect(progressOf(s, 60 * MIN)).toBe(1);
    expect(progressOf(s, 120 * MIN)).toBe(1); // oltre la durata, resta 1
  });
});

describe('progress — fillFraction', () => {
  test('progress=0: tutti gli archi vuoti', () => {
    for (let i = 0; i < 7; i++) expect(fillFraction(0, i)).toBe(0);
  });

  test('progress=1: tutti gli archi pieni', () => {
    for (let i = 0; i < 7; i++) expect(fillFraction(1, i)).toBe(1);
  });

  test('progress=0.5: primi 3 archi pieni, il 4° a metà, il resto vuoto', () => {
    expect(fillFraction(0.5, 0)).toBe(1);
    expect(fillFraction(0.5, 1)).toBe(1);
    expect(fillFraction(0.5, 2)).toBe(1);
    expect(fillFraction(0.5, 3)).toBeCloseTo(0.5, 5);
    expect(fillFraction(0.5, 4)).toBe(0);
    expect(fillFraction(0.5, 5)).toBe(0);
    expect(fillFraction(0.5, 6)).toBe(0);
  });
});

describe('progress — sunAngleDeg', () => {
  test('progress=0 → 180°, progress=1 → 0°, progress=0.5 → 90°', () => {
    expect(sunAngleDeg(0)).toBe(180);
    expect(sunAngleDeg(1)).toBe(0);
    expect(sunAngleDeg(0.5)).toBe(90);
  });
});

describe('progress — endTimeLabel', () => {
  test('formatta l\'orario di fine in italiano, formato 24h HH:mm', () => {
    const startedAt = new Date(2026, 6, 4, 13, 0, 0, 0).getTime();
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt, durationMs: 58 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    expect(endTimeLabel(s)).toBe('termina alle 13:58');
  });

  test('tiene conto delle pause già accumulate (pausedTotalMs) nello spostare la fine', () => {
    const startedAt = new Date(2026, 6, 4, 13, 0, 0, 0).getTime();
    const s: TimerSession = {
      meal: 'cena', dateISO: '2026-07-04', startedAt, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 10 * MIN, status: 'running',
    };
    // 13:00 + 60min durata + 10min già pausati = termina alle 14:10
    expect(endTimeLabel(s)).toBe('termina alle 14:10');
  });
});

describe('progress — restore', () => {
  test('restore di null ritorna null', () => {
    expect(restore(null, 0)).toBeNull();
  });

  test('sessione running "vecchia" (riavvio telefono): 2h trascorse, durata 60min → celebrating', () => {
    const t0 = 0;
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: t0, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    const now = t0 + 2 * 60 * MIN; // 2 ore dopo
    const restored = restore(s, now);
    expect(restored).toEqual({ ...s, status: 'celebrating' });
  });

  test('clock indietro (now < startedAt) → null', () => {
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: 100_000, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    expect(restore(s, 0)).toBeNull();
  });

  test('sessione paused non viene toccata dal restore anche se il progress "virtuale" supererebbe 1', () => {
    const t0 = 0;
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: t0, durationMs: 60 * MIN,
      pausedAt: 10 * MIN, pausedTotalMs: 0, status: 'paused',
    };
    const restored = restore(s, t0 + 5 * 60 * MIN);
    expect(restored).toEqual(s);
  });

  test('sessione running con progress < 1 resta invariata dopo restore', () => {
    const t0 = 0;
    const s: TimerSession = {
      meal: 'pranzo', dateISO: '2026-07-04', startedAt: t0, durationMs: 60 * MIN,
      pausedAt: null, pausedTotalMs: 0, status: 'running',
    };
    const restored = restore(s, t0 + 10 * MIN);
    expect(restored).toEqual(s);
  });
});
