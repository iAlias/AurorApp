import type { RoutineSettings } from '../../core/catalog/types';
import { RoutineFields } from './RoutineFields';

export interface StepRoutineProps {
  routine: RoutineSettings;
  onRoutineChange: (routine: RoutineSettings) => void;
  routineError: string | null;
}

/**
 * Step 4/6 — routine giornaliera (FR-1): i campi editabili vivono in
 * `RoutineFields` (condivisa con la sezione Routine di `SettingsPage`, Task
 * 20); questo componente aggiunge solo l'intestazione di step e l'errore
 * live di `validateRoutine` (calcolato da `WizardPage`, qui solo visualizzato).
 */
export function StepRoutine({ routine, onRoutineChange, routineError }: StepRoutineProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h2 className="font-display text-2xl text-deep">La routine di ogni giorno</h2>

      <RoutineFields routine={routine} onRoutineChange={onRoutineChange} />

      {routineError && <p className="font-body text-sm text-coral">{routineError}</p>}
    </div>
  );
}
