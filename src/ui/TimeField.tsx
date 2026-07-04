import { useId } from 'react';

export interface TimeFieldProps {
  value: string; // 'HH:mm'
  onChange: (v: string) => void;
  label: string;
}

/** Campo orario stilizzato sopra `<input type="time">` nativo (tastiera/picker del sistema). */
export function TimeField({ value, onChange, label }: TimeFieldProps) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-body text-sm font-semibold text-stone">{label}</span>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-card bg-card px-4 py-2.5 font-display text-lg text-deep shadow-soft outline-none focus:ring-2 focus:ring-sun"
      />
    </label>
  );
}
