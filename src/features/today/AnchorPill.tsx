import { toHHMM } from '../../core/planner/slots';

export interface AnchorPillProps {
  label: string;
  startMin: number;
  endMin: number;
}

/**
 * Pill compatta per un'ancora della routine (FR-2: sveglia/colazione,
 * merenda, riposino, bagnetto, nanna…) — non e' un'attivita' scelta dal
 * generatore, solo un punto fisso della giornata, quindi niente azioni.
 * Se `startMin === endMin` (es. "Nanna", un istante) mostra un solo orario;
 * altrimenti l'intervallo, come nella tabella FR-2.
 */
export function AnchorPill({ label, startMin, endMin }: AnchorPillProps) {
  const timeLabel = startMin === endMin ? toHHMM(startMin) : `${toHHMM(startMin)}–${toHHMM(endMin)}`;

  return (
    <div className="flex items-center gap-2 px-1 py-1 font-body text-sm font-semibold text-stone">
      <span aria-hidden="true">◉</span>
      <span>
        {timeLabel} {label}
      </span>
    </div>
  );
}
