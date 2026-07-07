import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/store';
import { TimerStart } from './TimerStart';
import { TimerRun } from './TimerRun';
import { Celebration } from './Celebration';

/**
 * Punto di ingresso della route `/timer` (FR-6, fullscreen fuori da
 * `Layout`): sceglie la schermata giusta in base alla sessione persistita.
 * Nessuna sessione → `TimerStart` (schermata di avvio, per l'adulto).
 *
 * Recovery (E1): al mount, `restoreTimer(Date.now())` applica `restore()`
 * (Task 15) — una sessione `running` scaduta nel frattempo (telefono
 * bloccato, riavvio) salta direttamente a `celebrating` invece di restare
 * visivamente "ferma" su un running ormai concluso; e' un no-op silenzioso
 * se non c'e' alcuna sessione. Chiamata via `useApp.getState()` (non un
 * selector) cosi' l'effetto non ha bisogno di `restoreTimer` tra le
 * dipendenze: riguarda solo l'apertura della schermata, non ogni
 * cambiamento successivo della sessione.
 */
export function MealTimerPage() {
  const timer = useApp((s) => s.timer);
  const navigate = useNavigate();

  useEffect(() => {
    useApp.getState().restoreTimer(Date.now());
  }, []);

  useEffect(() => {
    if (timer?.status === 'done') {
      navigate('/oggi', { replace: true });
    }
  }, [timer, navigate]);

  if (!timer) {
    return <TimerStart />;
  }

  if (timer.status === 'done') {
    return null; // la navigazione verso /oggi e' gia' in corso (effetto sopra)
  }

  if (timer.status === 'celebrating') {
    return <Celebration session={timer} onDone={() => navigate('/oggi', { replace: true })} />;
  }

  return <TimerRun session={timer} onExit={() => navigate('/oggi', { replace: true })} />;
}
