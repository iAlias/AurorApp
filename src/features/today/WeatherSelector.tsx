import type { Weather } from '../../core/catalog/types';

export interface WeatherSelectorProps {
  weather: Weather;
  onChange: (w: Weather) => void;
}

const OPTIONS: { value: Weather; emoji: string; label: string }[] = [
  { value: 'sole', emoji: '☀️', label: 'Sole' },
  { value: 'pioggia', emoji: '🌧️', label: 'Pioggia' },
  { value: 'caldo', emoji: '🥵', label: 'Caldo' },
];

/**
 * Selettore meteo a 3 stati (FR-5). Il tap su un'opzione diversa da quella
 * corrente chiama `onChange` (il chiamante fa `setWeather` — che rigenera
 * SOLO gli slot non `done` incompatibili, §FR-4); il tap sull'opzione già
 * selezionata è un no-op silenzioso (evita una rigenerazione inutile).
 */
export function WeatherSelector({ weather, onChange }: WeatherSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body text-xs font-semibold text-stone">
        Che tempo fa oggi? Cambia le attività proposte
      </span>
      <div className="flex gap-2" role="group" aria-label="Meteo di oggi">
        {OPTIONS.map((opt) => {
          const selected = opt.value === weather;
          return (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              aria-pressed={selected}
              onClick={() => {
                if (opt.value === weather) return;
                onChange(opt.value);
              }}
              className={[
                'flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-soft',
                'transition-transform duration-150 ease-out active:scale-[.97]',
                selected ? 'bg-sun' : 'bg-card',
              ].join(' ')}
            >
              <span aria-hidden="true">{opt.emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
