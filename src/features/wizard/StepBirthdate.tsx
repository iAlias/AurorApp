import { useId } from 'react';

export interface StepBirthdateProps {
  birthdate: string;
  onBirthdateChange: (value: string) => void;
  ageLabelText: string;
  ageWarningText: string | null;
}

/**
 * Step 3/6 — data di nascita (FR-1): `ageLabel` mostrata live sotto la data;
 * `ageWarning` e' un banner non bloccante (fuori range 2-5 anni, ma si puo'
 * comunque proseguire).
 */
export function StepBirthdate({ birthdate, onBirthdateChange, ageLabelText, ageWarningText }: StepBirthdateProps) {
  const birthId = useId();

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h2 className="font-display text-2xl text-deep">Quanti anni ha?</h2>

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
    </div>
  );
}
