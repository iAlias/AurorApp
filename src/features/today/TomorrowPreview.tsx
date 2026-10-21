import { useState } from 'react';
import { Button } from '../../ui/Button';
import { useCatalog } from '../../app/usePersonalize';
import type { DayPlan } from '../../core/catalog/types';

export interface TomorrowPreviewProps {
  plan: DayPlan | undefined;
  onRegenerate: () => void;
}

const SPECIAL_LABELS: Record<'mare' | 'nonni' | 'viaggio' | 'altro', string> = {
  mare: 'giornata al mare',
  nonni: 'giornata dai nonni',
  viaggio: 'in viaggio',
  altro: 'giornata speciale',
};

/**
 * Sezione "Domani" collassata in fondo alla timeline (FR-5): espandendola si
 * vede il piano di domani in sola lettura (nessuna azione sugli slot — sono
 * il domani, non l'oggi) più "Rigenera domani". `plan` può mancare solo in
 * un istante transitorio prima che `ensurePlans` lo materializzi.
 */
export function TomorrowPreview({ plan, onRegenerate }: TomorrowPreviewProps) {
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 border-t border-deep/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 font-display text-lg text-deep"
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span> Domani
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {!plan ? (
            <p className="font-body text-sm text-stone">Ancora da preparare…</p>
          ) : plan.special ? (
            <p className="font-body text-sm text-stone">
              Domani: {plan.special.label ?? SPECIAL_LABELS[plan.special.kind]}! 🏖
            </p>
          ) : plan.slots.length === 0 ? (
            <p className="font-body text-sm text-stone">Nessuna attività pianificata.</p>
          ) : (
            plan.slots.map((s) => {
              const activity = catalog.find((a) => a.id === s.activityId);
              if (!activity) return null;
              return (
                <div
                  key={s.slotId}
                  data-testid="tomorrow-slot"
                  className="flex items-center gap-2 rounded-card bg-cream px-3 py-2 font-body text-sm text-deep"
                >
                  <span aria-hidden="true">{activity.emoji}</span>
                  <span>{activity.title}</span>
                </div>
              );
            })
          )}

          <Button type="button" variant="secondary" onClick={onRegenerate}>
            Rigenera domani
          </Button>
        </div>
      )}
    </div>
  );
}
