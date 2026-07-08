import { useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { CATEGORIES } from '../../core/catalog/categories';
import { ACTIVITIES } from '../../core/catalog/activities';
import { ActivityDetail } from '../today/ActivityDetail';
import type { Activity, CategoryId, Energy, Place, PlannedSlot } from '../../core/catalog/types';

const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
const ALL_CATEGORIES = 'TUTTE' as const;
type CategoryFilter = CategoryId | typeof ALL_CATEGORIES;

const ENERGY_OPTIONS: { id: Energy; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'bassa', label: 'Bassa' },
];

const PLACE_OPTIONS: { id: Place; label: string }[] = [
  { id: 'casa', label: 'Casa' },
  { id: 'esterno', label: 'Esterno' },
  { id: 'entrambi', label: 'Casa o esterno' },
];

const MESS_OPTIONS: { id: 0 | 1 | 2; label: string }[] = [
  { id: 0, label: 'Pulita' },
  { id: 1, label: 'Un po’ sporca' },
  { id: 2, label: 'Si sporca' },
];

function pillClasses(selected: boolean): string {
  return [
    'rounded-full px-3 py-1.5 font-body text-sm font-semibold',
    selected ? 'bg-sun text-deep' : 'bg-cream text-stone',
  ].join(' ');
}

/** Slot fittizio per riusare `ActivityDetail` fuori dal contesto di un piano
 * giornaliero (Consultazione libera del catalogo, non collegata a "oggi"):
 * con `readOnly` il suo contenuto non è mai letto per abilitare/disabilitare
 * pulsanti, quindi bastano valori qualsiasi che rispettino il tipo. */
function fakeSlot(activityId: string): PlannedSlot {
  return { slotId: 'M1', activityId, status: 'planned', swapCount: 0 };
}

/**
 * Catalogo completo (consultazione libera, non legata al piano di un
 * giorno): tutte le 150 attività, filtrabili per categoria (pattern
 * `ActivityPicker`) più energia/luogo/quanto sporca — filtri utili per un
 * genitore che sfoglia "cosa c'è" prima di decidere. Il tap su una card apre
 * lo stesso `ActivityDetail` usato altrove, ma in sola lettura (`readOnly`):
 * qui non c'è uno slot reale da segnare Fatta/Saltata/Cambiala.
 */
export function CatalogPage() {
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [mess, setMess] = useState<0 | 1 | 2 | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);

  const filtered = useMemo(() => {
    return ACTIVITIES.filter((a) => {
      if (category !== ALL_CATEGORIES && a.category !== category) return false;
      if (energy !== null && a.energy !== energy) return false;
      if (place !== null && a.place !== place) return false;
      if (mess !== null && a.mess !== mess) return false;
      return true;
    });
  }, [category, energy, place, mess]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-8">
      <h1 className="font-display text-2xl text-deep">Catalogo attività</h1>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categoria">
        <button
          type="button"
          role="tab"
          aria-selected={category === ALL_CATEGORIES}
          onClick={() => setCategory(ALL_CATEGORIES)}
          className={pillClasses(category === ALL_CATEGORIES)}
        >
          Tutte
        </button>
        {CATEGORY_IDS.map((id) => {
          const cat = CATEGORIES[id];
          const selected = id === category;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(id)}
              className={pillClasses(selected)}
            >
              {cat.emoji} {cat.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-xs font-semibold text-stone">Energia</span>
          <button
            type="button"
            aria-pressed={energy === null}
            onClick={() => setEnergy(null)}
            className={pillClasses(energy === null)}
          >
            Qualsiasi
          </button>
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={energy === opt.id}
              onClick={() => setEnergy(energy === opt.id ? null : opt.id)}
              className={pillClasses(energy === opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-xs font-semibold text-stone">Luogo</span>
          <button
            type="button"
            aria-pressed={place === null}
            onClick={() => setPlace(null)}
            className={pillClasses(place === null)}
          >
            Qualsiasi
          </button>
          {PLACE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={place === opt.id}
              onClick={() => setPlace(place === opt.id ? null : opt.id)}
              className={pillClasses(place === opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-xs font-semibold text-stone">Quanto sporca</span>
          <button
            type="button"
            aria-pressed={mess === null}
            onClick={() => setMess(null)}
            className={pillClasses(mess === null)}
          >
            Qualsiasi
          </button>
          {MESS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={mess === opt.id}
              onClick={() => setMess(mess === opt.id ? null : opt.id)}
              className={pillClasses(mess === opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="font-body text-sm text-stone" aria-live="polite">
        {filtered.length} attività
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="catalog-grid">
        {filtered.map((activity) => (
          <button
            key={activity.id}
            type="button"
            data-testid="catalog-item"
            onClick={() => setDetailActivity(activity)}
            className="text-left"
          >
            <Card className="flex h-full flex-col items-center gap-1 text-center">
              <span className="text-2xl" aria-hidden="true">
                {activity.emoji}
              </span>
              <span className="font-body text-sm text-deep">{activity.title}</span>
              <span className="font-body text-xs text-stone">{activity.durationMin} min</span>
            </Card>
          </button>
        ))}
      </div>

      <ActivityDetail
        open={detailActivity !== null}
        activity={detailActivity}
        slot={detailActivity ? fakeSlot(detailActivity.id) : null}
        readOnly
        onClose={() => setDetailActivity(null)}
        onMarkDone={() => {}}
        onMarkSkipped={() => {}}
        onSwap={() => {}}
        onPickManual={() => {}}
      />
    </div>
  );
}
