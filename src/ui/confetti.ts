import confetti from 'canvas-confetti';
import { useApp } from '../app/store';

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
 */
export function burst(opts?: { big?: boolean }): void {
  if (isReducedMotion()) return;
  try {
    const big = opts?.big ?? false;
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
  } catch {
    // Effetto puramente decorativo: un fallimento di canvas-confetti non
    // deve mai rompere la celebrazione ne' mostrare un errore.
  }
}
