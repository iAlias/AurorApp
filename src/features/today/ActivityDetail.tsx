import { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { MarkDoneButton } from './MarkDoneButton';
import type { Activity, PlannedSlot } from '../../core/catalog/types';

export interface ActivityDetailProps {
  open: boolean;
  activity: Activity | null;
  slot: PlannedSlot | null;
  onClose: () => void;
  onMarkDone: () => void;
  onMarkSkipped: () => void;
  onSwap: () => void;
  onPickManual: () => void;
}

/**
 * Dettaglio attività (FR-5): Modal con flip 3D (già in `Modal`), "Sviluppa",
 * checklist materiali (solo delight per l'adulto che li raccoglie — stato
 * locale, non persistito, si azzera a ogni nuova attività), passi numerati,
 * "In più", nota di sicurezza evidenziata se presente, azioni Fatta/Saltata/
 * Cambiala/Scelgo io (chiudono sempre il dettaglio dopo l'azione — "Scelgo
 * io" chiude il dettaglio e apre l'`ActivityPicker` al suo posto, gestito dal
 * chiamante).
 */
export function ActivityDetail({
  open,
  activity,
  slot,
  onClose,
  onMarkDone,
  onMarkSkipped,
  onSwap,
  onPickManual,
}: ActivityDetailProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChecked(new Set());
  }, [activity?.id]);

  function toggleMaterial(m: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  if (!activity || !slot) {
    return (
      <Modal open={open} onClose={onClose}>
        <span />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={activity.title}>
      <div className="flex flex-col gap-4">
        <p className="font-body text-sm text-stone">
          <span className="font-semibold text-deep">Sviluppa: </span>
          {activity.develops.join(', ')}
        </p>

        <div>
          <p className="mb-1 font-display text-base text-deep">Materiali</p>
          <ul className="flex flex-col gap-1">
            {activity.materials.map((m) => (
              <li key={m}>
                <label className="flex items-center gap-2 font-body text-sm text-deep">
                  <input
                    type="checkbox"
                    checked={checked.has(m)}
                    onChange={() => toggleMaterial(m)}
                    className="h-5 w-5"
                  />
                  <span className={checked.has(m) ? 'text-stone line-through' : ''}>{m}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 font-display text-base text-deep">Come si fa</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 font-body text-sm text-deep">
            {activity.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>

        <p className="font-body text-sm text-stone">
          <span className="font-semibold text-deep">In più: </span>
          {activity.variation}
        </p>

        {activity.safety && (
          <p
            role="alert"
            className="rounded-card bg-coral/10 px-4 py-2 font-body text-sm font-semibold text-coral"
          >
            ⚠️ {activity.safety}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {slot.status !== 'done' && <MarkDoneButton onClick={onMarkDone} />}
          <Button type="button" variant="secondary" onClick={onMarkSkipped}>
            Saltata
          </Button>
          <Button type="button" variant="ghost" onClick={onSwap}>
            🔄 Cambiala
          </Button>
          <Button type="button" variant="ghost" onClick={onPickManual}>
            📚 Scelgo io
          </Button>
        </div>
      </div>
    </Modal>
  );
}
