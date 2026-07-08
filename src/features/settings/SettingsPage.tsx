import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/store';
import { CATALOG_VERSION } from '../../core/catalog/activities';
import type { RoutineSettings, Settings } from '../../core/catalog/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { AVATARS, validateRoutine } from '../wizard/wizardLogic';
import { RoutineFields } from '../wizard/RoutineFields';
import { DataSection } from './DataSection';
import { ProgressCard } from './ProgressCard';

const MEAL_MIN = 15;
const MEAL_MAX = 90;
const MEAL_STEP = 5;

function clampMeal(v: number): number {
  return Math.min(MEAL_MAX, Math.max(MEAL_MIN, v));
}

type ReducedMotionSetting = Settings['reducedMotion'];

const REDUCED_MOTION_OPTIONS: { value: ReducedMotionSetting; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'on', label: 'Sì' },
  { value: 'off', label: 'No' },
];

interface MealStepperProps {
  label: string;
  testId: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

function MealStepper({ label, testId, value, onDecrease, onIncrease }: MealStepperProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-sm font-semibold text-stone">{label}</span>
      <div className="flex items-center gap-4">
        <Button type="button" variant="secondary" onClick={onDecrease} aria-label={`Riduci ${label.toLowerCase()}`}>
          −
        </Button>
        <span className="font-display text-xl text-deep" data-testid={testId}>
          {value} min
        </span>
        <Button type="button" variant="secondary" onClick={onIncrease} aria-label={`Aumenta ${label.toLowerCase()}`}>
          +
        </Button>
      </div>
    </div>
  );
}

/**
 * Schermata Impostazioni (FR-8) + Progressi (FR-9), route `/impostazioni`
 * dentro `Layout`. Sezioni: Profilo (rilancia il wizard sugli step 2/5,
 * FR-8), Routine (`RoutineFields` condivisa col wizard + validazione
 * `validateRoutine` completata dal Task 20 + rigenerazione dei piani futuri
 * non-`done`), Pasti (steppers/toggle/slider ad applicazione immediata:
 * nessuno di questi incide sulla generazione dei piani, quindi non richiede
 * un salvataggio esplicito né una rigenerazione), Aspetto, Dati
 * (`DataSection`), Progressi (`ProgressCard`), Info.
 *
 * La routine invece VIVE in una bozza locale (`routineDraft`) e si applica
 * solo al tap su "Salva routine": è l'unica impostazione che può rendere
 * invalidi i piani futuri (slot <20min, Task 20) e la cui applicazione ha un
 * effetto collaterale non banale (rigenerazione) — merita quindi un gesto di
 * conferma esplicito invece di scrivere ad ogni singola modifica di orario.
 *
 * NESSUN redirect se `profile` è `null` (a differenza di `/oggi`/`/calendario`):
 * dopo un "Azzera tutto" la sezione Dati → Importa deve restare raggiungibile
 * per ripristinare un backup (AC-9 §14), altrimenti l'unica via sarebbe
 * rifare tutto il wizard. Le sezioni che davvero richiedono un profilo
 * (Profilo, il saluto in Info) si adattano semplicemente quando è assente.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);

  const [routineDraft, setRoutineDraft] = useState<RoutineSettings>(settings.routine);

  const routineError = validateRoutine(routineDraft, settings.meals);
  const routineDirty = JSON.stringify(routineDraft) !== JSON.stringify(settings.routine);

  function saveRoutine() {
    if (routineError) return;
    useApp.getState().updateSettings({ routine: routineDraft });
    useApp.getState().regenerateFutureFromToday();
  }

  function adjustMeal(meal: 'lunchMinutes' | 'dinnerMinutes', delta: number) {
    const patch =
      meal === 'lunchMinutes'
        ? { lunchMinutes: clampMeal(settings.meals.lunchMinutes + delta) }
        : { dinnerMinutes: clampMeal(settings.meals.dinnerMinutes + delta) };
    useApp.getState().updateSettings({ meals: patch });
  }

  function toggleSounds() {
    useApp.getState().updateSettings({ meals: { soundsOn: !settings.meals.soundsOn } });
  }

  function setVolume(v: number) {
    useApp.getState().updateSettings({ meals: { volume: v } });
  }

  function setReducedMotion(v: ReducedMotionSetting) {
    useApp.getState().updateSettings({ reducedMotion: v });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 pb-24">
      <h1 className="font-display text-2xl text-deep">Impostazioni</h1>

      {profile && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-deep">Profilo</h2>
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">
              {AVATARS.find((a) => a.id === profile.avatarId)?.emoji ?? '⭐'}
            </span>
            <span className="font-display text-lg text-deep">{profile.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/wizard?step=profilo')}>
              Modifica nome e avatar
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/wizard?step=interessi')}>
              Modifica interessi e spazi
            </Button>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-deep">Routine</h2>
        <RoutineFields routine={routineDraft} onRoutineChange={setRoutineDraft} />
        {routineError && <p className="font-body text-sm text-coral">{routineError}</p>}
        <Button
          type="button"
          onClick={saveRoutine}
          disabled={routineError !== null || !routineDirty}
          className="self-start"
        >
          Salva routine
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-deep">Pasti</h2>
        <MealStepper
          label="Durata pranzo"
          testId="pasti-pranzo-durata"
          value={settings.meals.lunchMinutes}
          onDecrease={() => adjustMeal('lunchMinutes', -MEAL_STEP)}
          onIncrease={() => adjustMeal('lunchMinutes', MEAL_STEP)}
        />
        <MealStepper
          label="Durata cena"
          testId="pasti-cena-durata"
          value={settings.meals.dinnerMinutes}
          onDecrease={() => adjustMeal('dinnerMinutes', -MEAL_STEP)}
          onIncrease={() => adjustMeal('dinnerMinutes', MEAL_STEP)}
        />
        <Button type="button" variant="ghost" onClick={toggleSounds} className="self-start">
          {settings.meals.soundsOn ? '🔔 Suoni attivi' : '🔕 Suoni disattivati'}
        </Button>
        <label className="flex flex-col gap-1 font-body text-sm font-semibold text-stone">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={settings.meals.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-deep">Aspetto</h2>
        <p className="font-body text-sm text-stone">Riduci le animazioni</p>
        <div className="flex gap-2">
          {REDUCED_MOTION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={settings.reducedMotion === opt.value ? 'primary' : 'secondary'}
              aria-pressed={settings.reducedMotion === opt.value}
              onClick={() => setReducedMotion(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>

      <DataSection />

      <ProgressCard />

      <Card className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-deep">Info</h2>
        <p className="font-body text-sm text-stone">Versione app: {import.meta.env.APP_VERSION}</p>
        <p className="font-body text-sm text-stone">Versione catalogo: {CATALOG_VERSION}</p>
        <p className="font-body text-xs text-stone">
          {profile
            ? `AurorApp è fatta con cura per ${profile.name} e per chi le vuole bene.`
            : 'AurorApp è fatta con cura per i più piccoli e per chi li accompagna.'}{' '}
          Nessun dato lascia mai questo dispositivo.
        </p>
      </Card>
    </div>
  );
}
