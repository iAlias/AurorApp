import { Chip } from '../../ui/Chip';
import { ALL_INTERESTS, ALL_SPACES } from '../../core/catalog/types';
import type { InterestTag, SpaceTag } from '../../core/catalog/types';

export interface StepInterestsProps {
  interests: InterestTag[];
  onToggleInterest: (tag: InterestTag) => void;
  spaces: SpaceTag[];
  onToggleSpace: (tag: SpaceTag) => void;
}

const INTEREST_LABELS: Record<InterestTag, string> = {
  animali: '🐾 Animali',
  disegno: '🎨 Disegno',
  musica: '🎵 Musica',
  acqua: '💧 Acqua',
  costruzioni: '🧱 Costruzioni',
  travestimenti: '👑 Travestimenti',
  natura: '🌿 Natura',
  libri: '📚 Libri',
  cucinare: '🍳 Cucinare',
  movimento: '🤸 Movimento',
};

const SPACE_LABELS: Record<SpaceTag, string> = {
  casa: '🏠 Casa',
  giardino: '🌳 Giardino',
  terrazzo: '🏞️ Terrazzo',
  parco: '🛝 Parco',
};

/**
 * Step 5/6 — interessi e spazi (FR-1): multi-select a Chip da `ALL_INTERESTS`
 * e `ALL_SPACES`. WizardPage richiede almeno 1 selezione per lista prima di
 * abilitare "Avanti".
 */
export function StepInterests({ interests, onToggleInterest, spaces, onToggleSpace }: StepInterestsProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="mb-3 font-display text-2xl text-deep">Cosa le piace fare?</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_INTERESTS.map((tag) => (
            <Chip key={tag} selected={interests.includes(tag)} onToggle={() => onToggleInterest(tag)}>
              {INTEREST_LABELS[tag]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-2xl text-deep">Dove giocherete?</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_SPACES.map((tag) => (
            <Chip key={tag} selected={spaces.includes(tag)} onToggle={() => onToggleSpace(tag)}>
              {SPACE_LABELS[tag]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
