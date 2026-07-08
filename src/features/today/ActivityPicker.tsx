import { useEffect, useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Card } from '../../ui/Card';
import { CATEGORIES } from '../../core/catalog/categories';
import { ACTIVITIES } from '../../core/catalog/activities';
import type { CategoryId } from '../../core/catalog/types';

export interface ActivityPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (activityId: string) => void;
  /** Attività attualmente nello slot, se nota: apre sulla sua categoria e la evidenzia nella lista. */
  currentActivityId?: string;
}

const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

/**
 * Sheet "Scelgo io" (scelta manuale del genitore, FR-5): tab per le 10
 * categorie del catalogo, sotto la lista COMPLETA delle attività di quella
 * categoria — senza alcun filtro di compatibilità (energia/meteo/luogo/
 * durata slot): è una scelta deliberata dell'adulto, diversa da "🔄 Cambiala"
 * che invece rispetta i vincoli. Tap su un'attività chiude lo sheet e
 * comunica l'id scelto al chiamante, che scrive nello store
 * (`setSlotActivity`).
 */
export function ActivityPicker({ open, onClose, onPick, currentActivityId }: ActivityPickerProps) {
  const currentActivity = currentActivityId ? ACTIVITIES.find((a) => a.id === currentActivityId) : undefined;
  const [category, setCategory] = useState<CategoryId>(currentActivity?.category ?? CATEGORY_IDS[0]);

  // Ogni apertura riparte dalla categoria dell'attività corrente dello slot
  // (se nota), così il genitore la ritrova subito invece di dover ricercare.
  useEffect(() => {
    if (open) setCategory(currentActivity?.category ?? CATEGORY_IDS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentActivityId]);

  const activitiesInCategory = ACTIVITIES.filter((a) => a.category === category);

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-deep">Scelgo io</h2>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categoria">
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
                className={[
                  'rounded-full px-3 py-1.5 font-body text-sm font-semibold',
                  selected ? 'bg-sun text-deep' : 'bg-cream text-stone',
                ].join(' ')}
              >
                {cat.emoji} {cat.name}
              </button>
            );
          })}
        </div>

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto" data-testid="activity-picker-list">
          {activitiesInCategory.map((activity) => {
            const isCurrent = activity.id === currentActivityId;
            return (
              <button
                key={activity.id}
                type="button"
                data-testid="activity-picker-item"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onPick(activity.id)}
                className="text-left"
              >
                <Card
                  className={[
                    'flex items-center justify-between gap-2',
                    isCurrent ? 'ring-2 ring-sun' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">
                      {activity.emoji}
                    </span>
                    <span className="font-body text-sm text-deep">{activity.title}</span>
                  </div>
                  <span className="whitespace-nowrap font-body text-xs text-stone">
                    {activity.durationMin} min
                  </span>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
