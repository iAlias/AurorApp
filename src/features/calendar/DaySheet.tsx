import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Sheet } from '../../ui/Sheet';
import { Modal } from '../../ui/Modal';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ACTIVITIES } from '../../core/catalog/activities';
import { useApp } from '../../app/store';
import type { DayPlan } from '../../core/catalog/types';

export interface DaySheetProps {
  /** ISO del giorno selezionato, `null` = sheet chiuso. */
  dateISO: string | null;
  todayISO: string;
  plan: DayPlan | undefined;
  onClose: () => void;
}

type SpecialKind = 'mare' | 'nonni' | 'viaggio' | 'altro';

const SPECIAL_LABELS: Record<SpecialKind, string> = {
  mare: 'giornata al mare',
  nonni: 'giornata dai nonni',
  viaggio: 'in viaggio',
  altro: 'giornata speciale',
};

const SPECIAL_CHOICES: { kind: SpecialKind; label: string; emoji: string }[] = [
  { kind: 'mare', label: 'Mare', emoji: '🏖' },
  { kind: 'nonni', label: 'Dai nonni', emoji: '👵' },
  { kind: 'viaggio', label: 'In viaggio', emoji: '🧳' },
  { kind: 'altro', label: 'Altro', emoji: '✨' },
];

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Sheet di dettaglio di un giorno dal Calendario (FR-7): card compatte del
 * piano (sola lettura se il giorno è passato) più le azioni "Rigenera",
 * "Giorno speciale…"/"Torna normale". Nessuna delle azioni chiude lo sheet
 * (si vede subito l'effetto sul piano, come "Rigenera domani" in
 * `TomorrowPreview`) — chiude solo Esc/backdrop/cambio giorno.
 *
 * `confirmingRegenerate`/`pickingSpecial` aprono una `Modal` ANNIDATA dentro
 * questo stesso componente (non dentro `<Sheet>`, ma comunque montata mentre
 * lo sheet resta aperto): la `Sheet` e la `Modal` hanno ciascuna un proprio
 * listener `keydown` globale per Esc, quindi un Esc con la modale aperta
 * farebbe scattare ANCHE l'handler dello sheet. `handleSheetClose` sotto
 * ignora la richiesta di chiusura mentre una delle due modali interne è
 * aperta, così Esc chiude prima la modale (comportamento atteso) e solo un
 * secondo Esc chiude lo sheet.
 */
export function DaySheet({ dateISO, todayISO, plan, onClose }: DaySheetProps) {
  const [pickingSpecial, setPickingSpecial] = useState(false);
  const [specialKind, setSpecialKind] = useState<SpecialKind>('mare');
  const [specialLabel, setSpecialLabel] = useState('');
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const open = dateISO !== null;
  const readOnly = dateISO !== null && dateISO < todayISO;

  function resetInnerState() {
    setPickingSpecial(false);
    setSpecialKind('mare');
    setSpecialLabel('');
    setConfirmingRegenerate(false);
  }

  function handleSheetClose() {
    if (confirmingRegenerate || pickingSpecial) return; // Esc chiude prima la modale interna
    resetInnerState();
    onClose();
  }

  function doRegenerate() {
    if (!dateISO) return;
    useApp.getState().regenerate(dateISO);
    setConfirmingRegenerate(false);
  }

  function handleRegenerateClick() {
    const hasDone = plan?.slots.some((s) => s.status === 'done') ?? false;
    if (hasDone) setConfirmingRegenerate(true);
    else doRegenerate();
  }

  function handleConfirmSpecial() {
    if (!dateISO) return;
    useApp.getState().setSpecial(dateISO, { kind: specialKind, label: specialLabel.trim() || undefined });
    setPickingSpecial(false);
    setSpecialKind('mare');
    setSpecialLabel('');
  }

  function handleBackToNormal() {
    if (!dateISO) return;
    useApp.getState().setSpecial(dateISO, undefined);
  }

  if (!dateISO) {
    // Nessun giorno selezionato: sheet chiuso, nessun contenuto da preparare.
    return <Sheet open={false} onClose={handleSheetClose}><span /></Sheet>;
  }

  const dayLabel = capitalize(format(parseISO(dateISO), 'EEEE d MMMM', { locale: it }));

  return (
    <>
      <Sheet open={open} onClose={handleSheetClose}>
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-deep">{dayLabel}</h2>

          {!plan ? (
            <p className="font-body text-sm text-stone">Nessun piano per questo giorno.</p>
          ) : plan.special ? (
            <Card className="text-center">
              <p className="font-display text-lg text-deep">
                {plan.special.label ?? SPECIAL_LABELS[plan.special.kind]} 🏖
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {plan.slots.map((slot) => {
                const activity = ACTIVITIES.find((a) => a.id === slot.activityId);
                if (!activity) return null;
                return (
                  <div key={slot.slotId} data-testid="day-sheet-slot">
                    <Card className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{activity.emoji}</span>
                        <span className="font-body text-sm text-deep">{activity.title}</span>
                      </div>
                      {slot.status === 'done' && (
                        <span aria-label="Fatta" className="text-lg text-aqua">
                          ✅
                        </span>
                      )}
                      {slot.status === 'skipped' && (
                        <span aria-label="Saltata" className="text-lg text-stone">
                          ⏭️
                        </span>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {readOnly ? (
            <p className="font-body text-xs italic text-stone">Giorno passato: sola lettura.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!plan?.special && (
                <Button type="button" variant="secondary" onClick={handleRegenerateClick}>
                  🔄 Rigenera
                </Button>
              )}
              {plan?.special ? (
                <Button type="button" variant="ghost" onClick={handleBackToNormal}>
                  Torna normale
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setPickingSpecial(true)}>
                  Giorno speciale…
                </Button>
              )}
            </div>
          )}
        </div>
      </Sheet>

      <Modal
        open={confirmingRegenerate}
        onClose={() => setConfirmingRegenerate(false)}
        title="Rigenerare il giorno?"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-deep">
            Le attività già fatte restano; le altre cambiano.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={doRegenerate}>
              Sì, rigenera
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingRegenerate(false)}>
              Annulla
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={pickingSpecial} onClose={() => setPickingSpecial(false)} title="Giorno speciale">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {SPECIAL_CHOICES.map((c) => (
              <button
                key={c.kind}
                type="button"
                onClick={() => setSpecialKind(c.kind)}
                aria-pressed={specialKind === c.kind}
                className={[
                  'rounded-full px-4 py-2 font-body text-sm font-semibold',
                  specialKind === c.kind ? 'bg-sun text-deep' : 'bg-cream text-stone',
                ].join(' ')}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 font-body text-sm text-deep">
            Etichetta (facoltativa)
            <input
              type="text"
              value={specialLabel}
              onChange={(e) => setSpecialLabel(e.target.value)}
              placeholder="es. Weekend a Riccione"
              className="rounded-card border border-deep/20 px-3 py-2 font-body text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={handleConfirmSpecial}>
              Conferma
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPickingSpecial(false)}>
              Annulla
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
