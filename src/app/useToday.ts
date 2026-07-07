import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export interface UseTodayResult {
  todayISO: string;
}

/** Intervallo di verifica del cambio data (E2): abbastanza fitto da non far percepire
 *  ritardo intorno alla mezzanotte, abbastanza rado da non pesare sulla batteria. */
const CHECK_INTERVAL_MS = 30_000;

function currentDateISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Espone la data odierna (ISO yyyy-MM-dd) e la tiene aggiornata mentre l'app
 * resta aperta oltre la mezzanotte: un `setInterval` da 30s confronta la
 * data corrente con quella in stato e aggiorna solo se è cambiata (E2).
 * Cleanup dell'intervallo su unmount (nessun leak — stesso criterio di cura
 * applicato in `useLongPress.ts`).
 */
export function useToday(): UseTodayResult {
  const [todayISO, setTodayISO] = useState(currentDateISO);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = currentDateISO();
      setTodayISO((prev) => (prev === now ? prev : now));
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return { todayISO };
}
