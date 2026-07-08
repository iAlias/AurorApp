import { useApp } from '../app/store';

/**
 * `canvas-confetti` e' caricato pigramente (Task 22, §M7 performance): non
 * serve all'avvio dell'app, solo al primo traguardo/celebrazione. Il modulo
 * viene richiesto la prima volta che `burst()` e' invocato davvero (dopo il
 * controllo reduced-motion, cosi' chi non vede mai coriandoli non lo scarica
 * affatto) e la Promise viene cachata per le chiamate successive.
 */
function loadConfetti() {
  return import('canvas-confetti').then((m) => m.default);
}

let confettiModulePromise: ReturnType<typeof loadConfetti> | null = null;

function getConfetti() {
  if (!confettiModulePromise) {
    confettiModulePromise = loadConfetti();
  }
  return confettiModulePromise;
}

const PALETTE = ['#FFD166', '#EF476F', '#06D6A0', '#4CC9F0'];

function isReducedMotion(): boolean {
  const setting = useApp.getState().settings.reducedMotion;
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Pioggia di coriandoli per le celebrazioni (§8.1/9.3). No-op silenzioso se
 * l'utente preferisce animazioni ridotte (di sistema o da impostazioni) —
 * in quel caso la celebrazione resta comunque comunicata da testo/audio,
 * senza l'effetto decorativo. `big` intensifica il getto per il finale
 * del timer pasto rispetto a un piccolo traguardo (es. slot completato).
 *
 * `canvas-confetti` e' importato dinamicamente (Task 22): la firma pubblica
 * resta sincrona per non toccare i chiamanti esistenti (Task 14/17/19), ma
 * internamente il primo `burst()` della sessione attende il download del
 * chunk prima di disegnare — un ritardo di rete accettabile per un effetto
 * puramente decorativo, mai propagato come eccezione non gestita.
 */
export function burst(opts?: { big?: boolean }): void {
  if (isReducedMotion()) return;
  const big = opts?.big ?? false;
  getConfetti()
    .then((confetti) => {
      confetti({
        particleCount: big ? 140 : 60,
        spread: big ? 100 : 65,
        startVelocity: big ? 45 : 32,
        origin: { y: 0.6 },
        colors: PALETTE,
        scalar: big ? 1.1 : 0.9,
      });
      if (big) {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: PALETTE,
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: PALETTE,
        });
      }
    })
    .catch(() => {
      // Effetto puramente decorativo: un fallimento nel caricare o eseguire
      // canvas-confetti non deve mai rompere la celebrazione ne' mostrare
      // un errore non gestito.
    });
}
