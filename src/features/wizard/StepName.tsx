import { useId } from 'react';
import { Chip } from '../../ui/Chip';
import { AVATARS } from './wizardLogic';
import type { Gender } from '../../core/catalog/types';

export interface StepNameProps {
  name: string;
  onNameChange: (value: string) => void;
  nameError: string | null;
  gender: Gender | '';
  onGenderChange: (g: Gender) => void;
  avatarId: string;
  onAvatarChange: (id: string) => void;
}

const GENDERS: { id: Gender; emoji: string; label: string }[] = [
  { id: 'f', emoji: '👧', label: 'Bambina' },
  { id: 'm', emoji: '👦', label: 'Bambino' },
];

/**
 * Step 2/6 — nome, bambina/bambino e avatar (FR-1): input validato live via
 * `validateName`, scelta del genere (accorda i testi: "Bravissima/o", "lei/lui"
 * nelle attività) e scelta singola tra gli 8 `AVATARS`. WizardPage decide se
 * "Avanti" e' abilitato (nome valido + genere + avatar scelti); questo
 * componente resta presentazionale.
 */
export function StepName({
  name,
  onNameChange,
  nameError,
  gender,
  onGenderChange,
  avatarId,
  onAvatarChange,
}: StepNameProps) {
  const inputId = useId();
  const showError = name.trim().length > 0 && nameError !== null;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <h2 className="font-display text-2xl text-deep">Come si chiama?</h2>

      <label htmlFor={inputId} className="flex flex-col gap-1">
        <span className="font-body text-sm font-semibold text-stone">Nome</span>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Es. Sofia"
          className="rounded-card bg-card px-4 py-2.5 font-display text-lg text-deep shadow-soft outline-none focus:ring-2 focus:ring-sun"
        />
      </label>
      {showError && <p className="font-body text-sm text-coral">{nameError}</p>}

      <div className="flex flex-col gap-2">
        <span className="font-body text-sm font-semibold text-stone">È una bambina o un bambino?</span>
        <div className="flex flex-wrap gap-3">
          {GENDERS.map((g) => (
            <Chip key={g.id} selected={gender === g.id} onToggle={() => onGenderChange(g.id)}>
              <span className="text-2xl" aria-hidden="true">
                {g.emoji}
              </span>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-body text-sm font-semibold text-stone">Scegli un avatar</span>
        <div className="flex flex-wrap gap-3">
          {AVATARS.map((avatar) => (
            <Chip
              key={avatar.id}
              selected={avatarId === avatar.id}
              onToggle={() => onAvatarChange(avatar.id)}
            >
              <span className="text-2xl" aria-hidden="true">
                {avatar.emoji}
              </span>
              <span className="sr-only">{avatar.label}</span>
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
