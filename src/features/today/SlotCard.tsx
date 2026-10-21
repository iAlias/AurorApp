import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { MarkDoneButton } from './MarkDoneButton';
import { usePersonalize } from '../../app/usePersonalize';
import { CATEGORIES } from '../../core/catalog/categories';
import { toHHMM } from '../../core/planner/slots';
import type { SlotDef } from '../../core/planner/slots';
import type { Activity, PlannedSlot } from '../../core/catalog/types';

export interface SlotCardProps {
  slot: PlannedSlot;
  def: SlotDef;
  activity: Activity;
  onMarkDone: () => void;
  onSwap: () => void;
  onPickManual: () => void;
  onOpenDetail: () => void;
  innerRef?: (el: HTMLDivElement | null) => void;
}

const MAX_MATERIALS = 3;

/**
 * Card di uno slot attività nella timeline di Oggi (FR-5): emoji categoria,
 * titolo, orario derivato dallo `SlotDef` (non dall'attività — lo slot ha
 * un orario fisso, l'attività può durare meno), chip materiali (primi 3 +
 * "…"), stati visivi (`skipped` attenuata, `done` con spunta) e le due
 * azioni rapide "Fatta! ⭐"/"🔄 Cambiala"/"📚 Scelgo io" (nascoste una volta
 * `done`: a quel punto l'unica via per tornare indietro è il dettaglio).
 *
 * Il tap sulla zona titolo/emoji/orario apre `ActivityDetail` (`onOpenDetail`);
 * è un `<button>` dedicato, SIBLING della riga "Fatta!"/"Cambiala" — non un
 * `onClick` sull'intera `Card` (che la trasformerebbe in un contenitore
 * `role="button"` con due bottoni reali annidati dentro: nome accessibile
 * ambiguo, doppio match nei test/screen reader). Bottoni reali affiancati,
 * mai annidati.
 */
export function SlotCard({
  slot,
  def,
  activity,
  onMarkDone,
  onSwap,
  onPickManual,
  onOpenDetail,
  innerRef,
}: SlotCardProps) {
  const g = usePersonalize();
  const done = slot.status === 'done';
  const skipped = slot.status === 'skipped';
  const materials = activity.materials.slice(0, MAX_MATERIALS);
  const hasMoreMaterials = activity.materials.length > MAX_MATERIALS;
  const freePlay = activity.durationMin < def.durationMin;
  const outdoor = activity.place === 'esterno';
  const category = CATEGORIES[activity.category];

  return (
    <div ref={innerRef} data-testid="slot-card">
      <Card className={skipped ? 'opacity-50' : ''}>
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={`Dettagli attività: ${activity.title}`}
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <div className="flex items-start gap-2">
            <span className="text-2xl" aria-hidden="true">
              {activity.emoji}
            </span>
            <div>
              <p data-testid="slot-title" className="font-display text-lg leading-tight text-deep">
                {activity.title}
              </p>
              <p className="font-body text-sm text-stone">
                {category.emoji} {toHHMM(def.startMin)}–{toHHMM(def.endMin)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {done && (
              <span data-testid="slot-done" aria-label="Fatta" className="text-xl text-aqua">
                ✅
              </span>
            )}
            {outdoor && (
              <span
                data-testid="badge-esterno"
                className="whitespace-nowrap rounded-full bg-sky/20 px-2 py-0.5 font-body text-xs font-semibold text-deep"
              >
                🌳 esterno
              </span>
            )}
          </div>
        </button>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {materials.map((m) => (
            <span key={m} className="rounded-full bg-cream px-2 py-0.5 font-body text-xs text-stone">
              {m}
            </span>
          ))}
          {hasMoreMaterials && <span className="font-body text-xs text-stone">…</span>}
        </div>

        {freePlay && (
          <p className="mt-2 font-body text-xs italic text-stone">
            {g('poi gioco libero: lascia che sia {lei|lui} a guidare')}
          </p>
        )}

        {!done && (
          <div className="mt-3 flex gap-2">
            <MarkDoneButton onClick={onMarkDone} size="md" />
            <Button type="button" variant="secondary" size="md" onClick={onSwap}>
              🔄 Cambiala
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={onPickManual}>
              📚 Scelgo io
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
