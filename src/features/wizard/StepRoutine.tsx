import { TimeField } from '../../ui/TimeField';
import { Button } from '../../ui/Button';
import type { RoutineSettings } from '../../core/catalog/types';

export interface StepRoutineProps {
  routine: RoutineSettings;
  onRoutineChange: (routine: RoutineSettings) => void;
  routineError: string | null;
}

const NAP_MIN = 30;
const NAP_MAX = 180;
const NAP_STEP = 15;

/**
 * Step 4/6 — routine giornaliera (FR-1): un `TimeField` per ciascuna
 * ancora di `RoutineSettings` (default da `DEFAULT_ROUTINE`), piu' uno
 * stepper per la durata della nanna (30-180 min). L'errore live di
 * `validateRoutine` (ordine non crescente) e' calcolato da WizardPage e
 * passato qui solo per la visualizzazione.
 */
export function StepRoutine({ routine, onRoutineChange, routineError }: StepRoutineProps) {
  function setField<K extends keyof RoutineSettings>(key: K, value: RoutineSettings[K]) {
    onRoutineChange({ ...routine, [key]: value });
  }

  function adjustNap(delta: number) {
    const next = Math.min(NAP_MAX, Math.max(NAP_MIN, routine.napMinutes + delta));
    setField('napMinutes', next);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h2 className="font-display text-2xl text-deep">La routine di ogni giorno</h2>

      <div className="grid grid-cols-2 gap-4">
        <TimeField label="Sveglia" value={routine.wakeTime} onChange={(v) => setField('wakeTime', v)} />
        <TimeField
          label="Fine colazione"
          value={routine.breakfastEnd}
          onChange={(v) => setField('breakfastEnd', v)}
        />
        <TimeField
          label="Merenda mattutina (inizio)"
          value={routine.morningSnackStart}
          onChange={(v) => setField('morningSnackStart', v)}
        />
        <TimeField
          label="Merenda mattutina (fine)"
          value={routine.morningSnackEnd}
          onChange={(v) => setField('morningSnackEnd', v)}
        />
        <TimeField label="Pranzo" value={routine.lunchStart} onChange={(v) => setField('lunchStart', v)} />
        <TimeField label="Nanna (inizio)" value={routine.napStart} onChange={(v) => setField('napStart', v)} />
        <TimeField
          label="Merenda pomeridiana (fine)"
          value={routine.afternoonSnackEnd}
          onChange={(v) => setField('afternoonSnackEnd', v)}
        />
        <TimeField label="Cena" value={routine.dinnerStart} onChange={(v) => setField('dinnerStart', v)} />
        <TimeField label="Buonanotte" value={routine.bedTime} onChange={(v) => setField('bedTime', v)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-body text-sm font-semibold text-stone">Durata nanna pomeridiana</span>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => adjustNap(-NAP_STEP)}
            aria-label="Riduci durata nanna"
          >
            −
          </Button>
          <span className="font-display text-xl text-deep">{routine.napMinutes} min</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => adjustNap(NAP_STEP)}
            aria-label="Aumenta durata nanna"
          >
            +
          </Button>
        </div>
      </div>

      {routineError && <p className="font-body text-sm text-coral">{routineError}</p>}
    </div>
  );
}
