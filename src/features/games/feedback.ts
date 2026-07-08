import { burst } from '../../ui/confetti';
import { audioManager } from '../../ui/audio';

/**
 * Feedback condiviso da tutti i giochi (Task 3-6 lo richiamano dal proprio
 * round-handler): un piccolo traguardo (round giusto) resta discreto, la
 * fine del gioco intero è la festa grande — stessa gerarchia già usata dal
 * timer pasto (`Celebration.tsx` vs. i suoni intermedi di `TimerRun`).
 */
export function celebrateRound(soundsOn: boolean): void {
  burst();
  if (soundsOn) audioManager.play('pop');
}

export function celebrateGameEnd(soundsOn: boolean): void {
  burst({ big: true });
  if (soundsOn) audioManager.play('party');
}
