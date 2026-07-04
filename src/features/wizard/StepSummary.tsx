import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { burst } from '../../ui/confetti';

export interface StepSummaryProps {
  name: string;
  avatarEmoji: string;
  onConfirm: () => void;
}

const GENERATING_PHRASES = [
  'Sto preparando le sorprese...',
  'Scelgo le attività più belle...',
  'Aggiungo un pizzico di magia ✨',
];

const GENERATION_MS = 2000;
const PHRASE_INTERVAL_MS = 650;

/**
 * Step 6/6 — riepilogo (FR-1): card avatar+nome, CTA "Crea la nostra estate
 * ✨" che avvia ~2s di animazione di generazione (coriandoli `burst({big:
 * true})` + testo rotante) prima di chiamare `onConfirm` (fornito da
 * WizardPage: e' li' che avviene la scrittura nello store, non qui).
 */
export function StepSummary({ name, avatarEmoji, onConfirm }: StepSummaryProps) {
  const [generating, setGenerating] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    if (!generating) return undefined;

    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % GENERATING_PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    const timeout = setTimeout(() => {
      onConfirmRef.current();
    }, GENERATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [generating]);

  function handleClick() {
    burst({ big: true });
    setGenerating(true);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <h2 className="font-display text-2xl text-deep">Tutto pronto!</h2>

      <Card className="flex flex-col items-center gap-3 px-8 py-6">
        <span className="text-6xl" aria-hidden="true">
          {avatarEmoji}
        </span>
        <span className="font-display text-2xl text-deep">{name}</span>
      </Card>

      {generating ? (
        <p className="font-body text-lg text-stone" role="status">
          {GENERATING_PHRASES[phraseIndex]}
        </p>
      ) : (
        <Button type="button" size="xl" onClick={handleClick}>
          Crea la nostra estate ✨
        </Button>
      )}
    </div>
  );
}
