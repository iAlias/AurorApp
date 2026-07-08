import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Sheet } from '../../ui/Sheet';
import { Modal } from '../../ui/Modal';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ACTIVITIES } from '../../core/catalog/activities';
import { useApp } from '../../app/store';
import { ActivityDetail } from '../today/ActivityDetail';
import { ActivityPicker } from '../today/ActivityPicker';
import type { DayPlan, SlotId } from '../../core/catalog/types';

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
 * `confirmingRegenerate`/`pickingSpecial`/`confirmingSpecialLoss` aprono una
 * `Modal` ANNIDATA dentro questo stesso componente (non dentro `<Sheet>`, ma
 * comunque montata mentre lo sheet resta aperto): la `Sheet` e la `Modal`
 * hanno ciascuna un proprio listener `keydown` globale per Esc, quindi un Esc
 * con la modale aperta farebbe scattare ANCHE l'handler dello sheet.
 * `handleSheetClose` sotto ignora la richiesta di chiusura mentre una delle
 * modali interne è aperta, così Esc chiude prima la modale (comportamento
 * atteso) e solo un secondo Esc chiude lo sheet. Le tre modali non sono mai
 * aperte insieme: `confirmingSpecialLoss` sostituisce `pickingSpecial` (non
 * si affianca) quando scatta, cosi' resta sempre un solo backdrop/listener
 * attivo alla volta.
 *
 * `detailSlotId`/`pickingSlotId` riusano `ActivityDetail`/`ActivityPicker`
 * (stessi componenti di `TodayPage`, stesso pattern) per il tap su una card
 * attività: stesso discorso Esc di sopra, quindi entrano nella stessa guardia.
 * `ActivityPicker` in più è internamente una `Sheet` come questo componente:
 * due `Sheet` aperte insieme hanno due listener Esc indipendenti, quindi un
 * Esc con `ActivityPicker` aperta farebbe scattare ANCHE l'handler di questo
 * sheet esterno — stessa guardia, stesso rimedio.
 */
export function DaySheet({ dateISO, todayISO, plan, onClose }: DaySheetProps) {
  const [pickingSpecial, setPickingSpecial] = useState(false);
  const [specialKind, setSpecialKind] = useState<SpecialKind>('mare');
  const [specialLabel, setSpecialLabel] = useState('');
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [confirmingSpecialLoss, setConfirmingSpecialLoss] = useState(false);
  const [detailSlotId, setDetailSlotId] = useState<SlotId | null>(null);
  const [pickingSlotId, setPickingSlotId] = useState<SlotId | null>(null);

  const open = dateISO !== null;
  const readOnly = dateISO !== null && dateISO < todayISO;
  const hasDone = plan?.slots.some((s) => s.status === 'done') ?? false;

  function resetInnerState() {
    setPickingSpecial(false);
    setSpecialKind('mare');
    setSpecialLabel('');
    setConfirmingRegenerate(false);
    setConfirmingSpecialLoss(false);
    setDetailSlotId(null);
    setPickingSlotId(null);
  }

  function handleSheetClose() {
    // Esc chiude prima l'overlay interno (Modal di conferma/scelta speciale,
    // ActivityDetail, o la Sheet di ActivityPicker)
    if (confirmingRegenerate || pickingSpecial || confirmingSpecialLoss) return;
    if (detailSlotId !== null || pickingSlotId !== null) return;
    resetInnerState();
    onClose();
  }

  function doRegenerate() {
    if (!dateISO) return;
    useApp.getState().regenerate(dateISO);
    setConfirmingRegenerate(false);
  }

  function handleRegenerateClick() {
    if (hasDone) setConfirmingRegenerate(true);
    else doRegenerate();
  }

  function doApplySpecial() {
    if (!dateISO) return;
    useApp.getState().setSpecial(dateISO, { kind: specialKind, label: specialLabel.trim() || undefined });
    setPickingSpecial(false);
    setConfirmingSpecialLoss(false);
    setSpecialKind('mare');
    setSpecialLabel('');
  }

  /**
   * `setSpecial` (Task 13) sostituisce SEMPRE gli slot con `[]`, anche quelli
   * già `done` — a differenza di "Rigenera" che li preserva davvero. Se il
   * giorno ha attività fatte, quindi, prima di applicare serve un avviso
   * onesto (non lo stesso testo di "Rigenera": qui si perdono per davvero).
   */
  function handleConfirmSpecial() {
    if (hasDone) {
      setPickingSpecial(false);
      setConfirmingSpecialLoss(true);
      return;
    }
    doApplySpecial();
  }

  function handleBackToNormal() {
    if (!dateISO) return;
    useApp.getState().setSpecial(dateISO, undefined);
  }

  function handlePickActivity(activityId: string) {
    if (dateISO && pickingSlotId) useApp.getState().setSlotActivity(dateISO, pickingSlotId, activityId);
    setPickingSlotId(null);
  }

  if (!dateISO) {
    // Nessun giorno selezionato: sheet chiuso, nessun contenuto da preparare.
    return <Sheet open={false} onClose={handleSheetClose}><span /></Sheet>;
  }

  const dayLabel = capitalize(format(parseISO(dateISO), 'EEEE d MMMM', { locale: it }));

  const detailSlot = detailSlotId ? (plan?.slots.find((s) => s.slotId === detailSlotId) ?? null) : null;
  const detailActivity = detailSlot ? (ACTIVITIES.find((a) => a.id === detailSlot.activityId) ?? null) : null;
  const pickingSlot = pickingSlotId ? (plan?.slots.find((s) => s.slotId === pickingSlotId) ?? null) : null;

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
                    <Card>
                      <button
                        type="button"
                        onClick={() => setDetailSlotId(slot.slotId)}
                        aria-label={`Dettagli attività: ${activity.title}`}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
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
                      </button>
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

      <ActivityDetail
        open={detailSlotId !== null}
        activity={detailActivity}
        slot={detailSlot}
        readOnly={readOnly}
        onClose={() => setDetailSlotId(null)}
        onMarkDone={() => {
          if (dateISO && detailSlotId) useApp.getState().markSlot(dateISO, detailSlotId, 'done');
          setDetailSlotId(null);
        }}
        onMarkSkipped={() => {
          if (dateISO && detailSlotId) useApp.getState().markSlot(dateISO, detailSlotId, 'skipped');
          setDetailSlotId(null);
        }}
        onSwap={() => {
          if (dateISO && detailSlotId) useApp.getState().swapSlot(dateISO, detailSlotId);
          setDetailSlotId(null);
        }}
        onPickManual={() => {
          if (detailSlotId) setPickingSlotId(detailSlotId);
          setDetailSlotId(null);
        }}
      />

      <ActivityPicker
        open={pickingSlotId !== null}
        currentActivityId={pickingSlot?.activityId}
        onClose={() => setPickingSlotId(null)}
        onPick={handlePickActivity}
      />

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

      <Modal
        open={confirmingSpecialLoss}
        onClose={() => setConfirmingSpecialLoss(false)}
        title="Diventare un giorno speciale?"
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm text-deep">
            Hai già segnato delle attività fatte oggi: diventando un giorno speciale non si vedranno più
            nel piano. Continuare?
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={doApplySpecial}>
              Sì, rendi speciale
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingSpecialLoss(false)}>
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
