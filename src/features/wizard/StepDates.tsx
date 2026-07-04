import { useId } from 'react';

export interface StepDatesProps {
  birthdate: string;
  onBirthdateChange: (value: string) => void;
  vacationStart: string;
  onVacationStartChange: (value: string) => void;
  vacationEnd: string;
  onVacationEndChange: (value: string) => void;
  ageLabelText: string;
  ageWarningText: string | null;
  vacationError: string | null;
}

/**
 * Step 3/6 — data di nascita e date di vacanza (FR-1): `ageLabel` mostrata
 * live sotto la data di nascita; `ageWarning` e' un banner non bloccante
 * (fuori range 2-5 anni, ma si puo' comunque proseguire); l'errore di
 * `validateVacation` invece blocca "Avanti" (calcolato da WizardPage).
 */
export function StepDates({
  birthdate,
  onBirthdateChange,
  vacationStart,
  onVacationStartChange,
  vacationEnd,
  onVacationEndChange,
  ageLabelText,
  ageWarningText,
  vacationError,
}: StepDatesProps) {
  const birthId = useId();
  const startId = useId();
  const endId = useId();

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h2 className="font-display text-2xl text-deep">Quando e&apos; nata?</h2>

      <label htmlFor={birthId} className="flex flex-col gap-1">
        <span className="font-body text-sm font-semibold text-stone">Data di nascita</span>
        <input
          id={birthId}
          type="date"
          value={birthdate}
          onChange={(e) => onBirthdateChange(e.target.value)}
          className="rounded-card bg-card px-4 py-2.5 font-display text-lg text-deep shadow-soft outline-none focus:ring-2 focus:ring-sun"
        />
      </label>

      {birthdate && <p className="font-body text-sm text-stone">Età: {ageLabelText}</p>}
      {ageWarningText && (
        <p className="rounded-card bg-sun/30 px-4 py-2 font-body text-sm text-deep" role="status">
          {ageWarningText}
        </p>
      )}

      <h3 className="mt-2 font-display text-xl text-deep">Le vacanze</h3>

      <label htmlFor={startId} className="flex flex-col gap-1">
        <span className="font-body text-sm font-semibold text-stone">Inizio vacanza</span>
        <input
          id={startId}
          type="date"
          value={vacationStart}
          onChange={(e) => onVacationStartChange(e.target.value)}
          className="rounded-card bg-card px-4 py-2.5 font-display text-lg text-deep shadow-soft outline-none focus:ring-2 focus:ring-sun"
        />
      </label>

      <label htmlFor={endId} className="flex flex-col gap-1">
        <span className="font-body text-sm font-semibold text-stone">Fine vacanza</span>
        <input
          id={endId}
          type="date"
          value={vacationEnd}
          onChange={(e) => onVacationEndChange(e.target.value)}
          className="rounded-card bg-card px-4 py-2.5 font-display text-lg text-deep shadow-soft outline-none focus:ring-2 focus:ring-sun"
        />
      </label>

      {vacationError && <p className="font-body text-sm text-coral">{vacationError}</p>}
    </div>
  );
}
