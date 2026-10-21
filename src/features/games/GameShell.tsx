import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/store';
import { Button } from '../../ui/Button';
import { celebrateGameEnd } from './feedback';
import { speak, stopSpeaking } from '../../ui/speech';
import { usePersonalize } from '../../app/usePersonalize';

export interface GameShellProps {
  title: string;
  emoji: string;
  /** Numero di round del gioco; 0 = gioco libero (niente stelle né schermata finale). */
  totalRounds: number;
  /** Round completati finora (0..totalRounds). */
  completedRounds: number;
  /** true quando il gioco è finito: il guscio mostra la schermata finale. */
  finished: boolean;
  onRestart(): void;
  /** Consegna del round, letta ad alta voce a ogni round e col bottone 🔊. */
  prompt?: string;
  children: ReactNode;
}

/**
 * Guscio comune a tutti i giochi (Task 3-6 lo usano per il proprio
 * contenuto, passato come `children`): header con rientro alla griglia,
 * striscia di stelle di avanzamento (solo se `totalRounds > 0`), e la
 * schermata finale quando `finished` diventa true — coriandoli+suono UNA
 * sola volta all'ingresso (guardia via ref, stesso pattern di
 * `Celebration.tsx` nel timer pasto).
 */
export function GameShell({
  title,
  emoji,
  totalRounds,
  completedRounds,
  finished,
  onRestart,
  prompt,
  children,
}: GameShellProps) {
  const soundsOn = useApp((s) => s.settings.meals.soundsOn);
  const g = usePersonalize();
  const celebratedRef = useRef(false);

  // La schermata finale (stelle piene + "Bravissima!" + coriandoli/suono)
  // vale SOLO per i giochi a round: con `totalRounds === 0` (gioco libero,
  // es. "Disegna col dito") il contratto del prop promette "niente schermata
  // finale", quindi l'enforcement sta qui — in un solo posto — e non nella
  // disciplina di ogni singolo gioco che usa il guscio.
  const showFinal = finished && totalRounds > 0;

  useEffect(() => {
    if (!showFinal) {
      // Un "Gioca ancora" riporta finished a false: la guardia si riarma per
      // la prossima volta che il gioco finisce davvero.
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    celebrateGameEnd(soundsOn);
    if (soundsOn) speak(g('Bravissim{a|o}!'));
  }, [showFinal, soundsOn, g]);

  // Ogni round nuovo (anche con la stessa frase, es. "Quanti sono?") si
  // riascolta la consegna; la voce segue l'interruttore dei suoni.
  useEffect(() => {
    if (prompt && !showFinal && soundsOn) speak(prompt);
  }, [prompt, completedRounds, showFinal, soundsOn]);

  useEffect(() => stopSpeaking, []);

  const starsFilled = finished ? totalRounds : completedRounds;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-8">
      <Link to="/giochi" className="w-fit font-body text-sm font-semibold text-stone hover:text-deep">
        ← Giochi
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-3xl" aria-hidden="true">
          {emoji}
        </span>
        <h1 className="font-display text-2xl text-deep">{title}</h1>
        {prompt && !showFinal && (
          <button
            type="button"
            onClick={() => speak(prompt)}
            aria-label="Ascolta la consegna"
            className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky text-2xl shadow-soft transition-transform active:scale-[.97]"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </div>

      {totalRounds > 0 && (
        <div
          className="flex gap-1"
          role="img"
          aria-label={`${starsFilled} round su ${totalRounds} completati`}
        >
          {Array.from({ length: totalRounds }, (_, i) => (
            <span key={i} aria-hidden="true" className="text-xl">
              {i < starsFilled ? '⭐' : '☆'}
            </span>
          ))}
        </div>
      )}

      {showFinal ? (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <h2 className="font-display text-4xl text-deep">{g('Bravissim{a|o}! 🎉')}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" size="lg" onClick={onRestart}>
              Gioca ancora
            </Button>
            <Link
              to="/giochi"
              className="inline-flex items-center justify-center rounded-full bg-sky px-6 py-3 font-display text-lg font-bold text-deep shadow-soft transition-transform active:scale-[.97]"
            >
              Altri giochi
            </Link>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
