import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { useApp } from '../../app/store';
import { useToday } from '../../app/useToday';
import { MonthGrid } from './MonthGrid';
import { DaySheet } from './DaySheet';

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Schermata Calendario (FR-7): header "Giorno X di Y dell'estate" (stessa
 * formula di `TodayPage`, `differenceInCalendarDays` fra `vacationStart` e la
 * data corrente/`vacationEnd`) + barra di avanzamento, due mesi navigabili
 * (mese "corrente" della navigazione + il successivo, quest'ultimo visibile
 * solo `lg:` — due mesi affiancati su desktop) e `DaySheet` al tap su un giorno.
 *
 * Materializza sempre fino alla fine del mese SUCCESSIVO (capped a
 * `vacationEnd`, stesso criterio E10 di `TodayPage`): così anche il secondo
 * mese desktop ha già i piani pronti quando l'utente allarga la finestra,
 * senza aspettare un nuovo giro di effetto.
 */
export function CalendarPage() {
  const profile = useApp((s) => s.profile);
  const plans = useApp((s) => s.plans);
  const { todayISO } = useToday();

  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);

  const nextMonthDate = useMemo(() => addMonths(monthDate, 1), [monthDate]);

  useEffect(() => {
    if (!profile) return;
    const horizonISO = format(endOfMonth(nextMonthDate), 'yyyy-MM-dd');
    const cappedISO = horizonISO > profile.vacationEnd ? profile.vacationEnd : horizonISO;
    if (cappedISO < profile.vacationStart) return; // tutto il periodo visibile precede la vacanza
    useApp.getState().ensurePlansUpTo(cappedISO);
  }, [profile, nextMonthDate]);

  if (!profile) return <Navigate to="/wizard" replace />;

  const dayX = differenceInCalendarDays(parseISO(todayISO), parseISO(profile.vacationStart)) + 1;
  const totalY = differenceInCalendarDays(parseISO(profile.vacationEnd), parseISO(profile.vacationStart)) + 1;
  const progressPct = Math.min(100, Math.max(0, (dayX / totalY) * 100));

  const primaryTitle = (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Mese precedente"
        onClick={() => setMonthDate((d) => subMonths(d, 1))}
        className="grid h-10 w-10 place-items-center rounded-full text-xl text-deep hover:bg-deep/5"
      >
        ‹
      </button>
      <p className="font-display text-lg text-deep">{capitalize(format(monthDate, 'MMMM yyyy', { locale: it }))}</p>
      <button
        type="button"
        aria-label="Mese successivo"
        onClick={() => setMonthDate((d) => addMonths(d, 1))}
        className="grid h-10 w-10 place-items-center rounded-full text-xl text-deep hover:bg-deep/5"
      >
        ›
      </button>
    </div>
  );

  const secondaryTitle = (
    <p className="text-center font-display text-lg text-deep">
      {capitalize(format(nextMonthDate, 'MMMM yyyy', { locale: it }))}
    </p>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl text-deep">Calendario</h1>
        <p className="font-body text-sm text-stone">
          Giorno {dayX} di {totalY} dell&apos;estate
        </p>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-deep/10"
        >
          <div className="h-full rounded-full bg-sun" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <MonthGrid
          monthDate={monthDate}
          title={primaryTitle}
          todayISO={todayISO}
          vacationStart={profile.vacationStart}
          vacationEnd={profile.vacationEnd}
          plans={plans}
          onSelectDay={setSelectedDateISO}
        />
        <div className="hidden lg:block">
          <MonthGrid
            monthDate={nextMonthDate}
            title={secondaryTitle}
            todayISO={todayISO}
            vacationStart={profile.vacationStart}
            vacationEnd={profile.vacationEnd}
            plans={plans}
            onSelectDay={setSelectedDateISO}
          />
        </div>
      </div>

      <DaySheet
        dateISO={selectedDateISO}
        todayISO={todayISO}
        plan={selectedDateISO ? plans[selectedDateISO] : undefined}
        onClose={() => setSelectedDateISO(null)}
      />
    </div>
  );
}
