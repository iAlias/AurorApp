import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Modal } from '../../ui/Modal';
import { Sheet } from '../../ui/Sheet';
import { TimeField } from '../../ui/TimeField';
import { useLongPress } from '../../ui/useLongPress';
import { burst } from '../../ui/confetti';
import { audioManager } from '../../ui/audio';

const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * `/dev/ui` — pagina di servizio (non produzione) che monta un'istanza di
 * ogni componente del kit Task 6 in un unico posto, cosi' un umano (o un
 * task successivo) puo' verificarli a colpo d'occhio senza dover navigare
 * il resto dell'app, che ancora non li usa (Tasks 8-23).
 */
export function UiShowcase() {
  const [chipSelected, setChipSelected] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [time, setTime] = useState('09:00');
  const { handlers, progress, pressing } = useLongPress(() => {
    audioManager.unlock();
    audioManager.play('done-day');
    burst({ big: true });
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="font-display text-3xl text-deep">/dev/ui — Component Showcase</h1>

      <Card>
        <h2 className="mb-3 font-display text-xl text-deep">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primario</Button>
          <Button variant="secondary">Secondario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl text-deep">Chip</h2>
        <Chip selected={chipSelected} onToggle={() => setChipSelected((v) => !v)}>
          Animali 🐾
        </Chip>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl text-deep">TimeField</h2>
        <TimeField label="Orario sveglia" value={time} onChange={setTime} />
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl text-deep">Modal &amp; Sheet</h2>
        <div className="flex gap-3">
          <Button onClick={() => setModalOpen(true)}>Apri Modal</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Apri Sheet
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal di prova">
          <p className="font-body text-deep">Contenuto della modale.</p>
        </Modal>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <p className="font-body text-deep">Contenuto della sheet.</p>
        </Sheet>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl text-deep">Long-press (anello di progresso)</h2>
        <button
          type="button"
          {...handlers}
          className="relative grid h-24 w-24 place-items-center rounded-full bg-sun font-display text-sm text-deep shadow-lift"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="rgba(7,59,76,.15)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              stroke="#EF476F"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <span>{pressing ? 'Tieni…' : 'Premi 3s'}</span>
        </button>
      </Card>
    </div>
  );
}
