import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import type { ReactNode } from 'react';
import type { DayPlan } from '../../core/catalog/types';
import { isDayComplete } from '../../core/progress/streak';

export interface MonthGridProps {
  monthDate: Date;
  /** Intestazione da mostrare sopra la griglia (titolo mese, eventuali frecce di navigazione). */
  title: ReactNode;
  todayISO: string;
  vacationStart: string;
  vacationEnd: string;
  plans: Record<string, DayPlan>;
  onSelectDay: (dateISO: string) => void;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/**
 * Indicatore di stato di una cella (FR-7), priorità 🏖 > ⭐ > ◐ > ● > nessuno:
 * un giorno speciale non ha slot (non può essere anche "completo"), quindi i
 * casi sono mutuamente esclusivi nell'ordine in cui sono scritti qui.
 * `isDayComplete` (Task 18, `core/progress/streak.ts`) è la STESSA soglia
 * (≥2 done) usata per streak/badge — non ridefinita qui.
 * `●` (pianificato) compare solo per oggi/futuro senza alcun done: un giorno
 * PASSATO con piano ma 0 done non mostra alcun pallino (giornata "persa", non
 * "da fare") — lettura più onesta per un genitore che rivede il calendario a
 * cose fatte, scelta pratica non normata esplicitamente dal brief.
 */
function dayDot(plan: DayPlan | undefined, iso: string, todayISO: string): string | null {
  if (plan?.special) return '🏖';
  if (isDayComplete(plan)) return '⭐';
  if (plan && plan.slots.some((s) => s.status === 'done')) return '◐';
  if (plan && plan.slots.length > 0 && iso >= todayISO) return '●';
  return null;
}

/**
 * Griglia di un mese (FR-7), settimana lun→dom (NFR-6, `weekStartsOn: 1`).
 * Mostra solo i giorni del mese richiesto: celle vuote (nessun bottone)
 * colmano gli spazi prima del giorno 1 così le colonne restano allineate,
 * senza mischiare numeri di mesi adiacenti — più semplice e senza ambiguità
 * per il tap (che risolve sempre al mese "di casa" della cella).
 * Le celle fuori dal periodo vacanza (`vacationStart`/`vacationEnd`, E11) sono
 * disabilitate con un tooltip nativo (`title`).
 */
export function MonthGrid({
  monthDate,
  title,
  todayISO,
  vacationStart,
  vacationEnd,
  plans,
  onSelectDay,
}: MonthGridProps) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = (getDay(monthStart) + 6) % 7; // date-fns getDay: 0=domenica…6=sabato → Lun=0…Dom=6

  return (
    <div data-testid="month-grid" className="flex flex-col gap-2">
      {title}
      <div className="grid grid-cols-7 gap-1 text-center font-body text-xs font-semibold text-stone">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const outsidePeriod = iso < vacationStart || iso > vacationEnd;
          const plan = plans[iso];
          const dot = dayDot(plan, iso, todayISO);
          const isToday = iso === todayISO;

          return (
            <button
              key={iso}
              type="button"
              data-testid={`calendar-day-${iso}`}
              disabled={outsidePeriod}
              title={outsidePeriod ? 'fuori dalle vacanze' : undefined}
              onClick={() => onSelectDay(iso)}
              className={[
                'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-card font-body text-sm transition-transform duration-150 active:scale-95',
                outsidePeriod
                  ? 'cursor-not-allowed text-stone/40'
                  : 'cursor-pointer text-deep hover:bg-sun/20',
                isToday && !outsidePeriod ? 'ring-2 ring-sun' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{format(d, 'd')}</span>
              <span aria-hidden="true" className="text-xs leading-none">
                {dot ?? ' '}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
