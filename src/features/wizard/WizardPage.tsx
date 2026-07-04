import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../app/store';
import { Button } from '../../ui/Button';
import { pageFlipVariants, springSoft, useReducedMotionPref } from '../../ui/motion';
import { DEFAULT_MEALS, DEFAULT_ROUTINE } from '../../core/catalog/types';
import type { ChildProfile, InterestTag, RoutineSettings, SpaceTag } from '../../core/catalog/types';
import { AVATARS, ageLabel, ageWarning, validateName, validateRoutine, validateVacation } from './wizardLogic';
import { StepWelcome } from './StepWelcome';
import { StepName } from './StepName';
import { StepDates } from './StepDates';
import { StepRoutine } from './StepRoutine';
import { StepInterests } from './StepInterests';
import { StepSummary } from './StepSummary';

const TOTAL_STEPS = 6;
const FADE_VARIANTS = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const;
const PAGE_FLIP_EASE = [0.32, 0.72, 0, 1] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultBirthdate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultVacationEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 92);
  return d.toISOString().slice(0, 10);
}

/**
 * Legge `?step=profilo|interessi` (FR-8, rilancio parziale): torna l'indice
 * di step (0-based) da cui aprire il wizard direttamente. Assente/valore
 * ignoto → 0 (primo giro completo).
 */
function entryStepFromQuery(step: string | null): number {
  if (step === 'profilo') return 1;
  if (step === 'interessi') return 4;
  return 0;
}

/**
 * Wizard a 6 step (FR-1) + rilancio parziale (FR-8). Possiede l'indice di
 * step corrente e TUTTO lo stato del form: i dati si scrivono nello store
 * solo alla conferma finale (step 6), mai prima — coerente con "i dati si
 * salvano solo alla conferma finale" della spec. Ogni step e' un componente
 * presentazionale che riceve valori correnti + callback di modifica; la
 * validazione (da `wizardLogic`) e' calcolata qui e decide se "Avanti" e'
 * abilitato.
 */
export function WizardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const existingProfile = useApp((s) => s.profile);
  const existingRoutine = useApp((s) => s.settings.routine);
  const completeWizard = useApp((s) => s.completeWizard);
  const reducedMotion = useReducedMotionPref();

  const entryStep = entryStepFromQuery(searchParams.get('step'));
  const isRelaunch = entryStep > 0;

  const [step, setStep] = useState(entryStep);
  const [name, setName] = useState(() => existingProfile?.name ?? '');
  const [avatarId, setAvatarId] = useState(() => existingProfile?.avatarId ?? '');
  const [birthdate, setBirthdate] = useState(() => existingProfile?.birthdate ?? defaultBirthdate());
  const [vacationStart, setVacationStart] = useState(() => existingProfile?.vacationStart ?? todayISO());
  const [vacationEnd, setVacationEnd] = useState(() => existingProfile?.vacationEnd ?? defaultVacationEnd());
  const [routine, setRoutine] = useState<RoutineSettings>(() => existingRoutine ?? DEFAULT_ROUTINE);
  const [interests, setInterests] = useState<InterestTag[]>(() => existingProfile?.interests ?? []);
  const [spaces, setSpaces] = useState<SpaceTag[]>(() => existingProfile?.spaces ?? []);

  const nameError = validateName(name);
  const nameValid = nameError === null && avatarId !== '';

  const vacationError = validateVacation(vacationStart, vacationEnd);
  const datesValid = birthdate !== '' && vacationError === null;
  const ageLabelText = birthdate ? ageLabel(birthdate, todayISO()) : '';
  const ageWarningText = birthdate ? ageWarning(birthdate, todayISO()) : null;

  const routineError = validateRoutine(routine, DEFAULT_MEALS);
  const routineValid = routineError === null;

  const interestsValid = interests.length >= 1 && spaces.length >= 1;

  const stepValidity = [true, nameValid, datesValid, routineValid, interestsValid, true];
  const canAdvance = stepValidity[step];

  function toggleInterest(tag: InterestTag) {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleSpace(tag: SpaceTag) {
    setSpaces((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function goNext() {
    if (!canAdvance) return;
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(entryStep, s - 1));
  }

  const avatarEmoji = AVATARS.find((a) => a.id === avatarId)?.emoji ?? '❓';

  function handleConfirm() {
    const profile: ChildProfile = {
      id: existingProfile?.id ?? crypto.randomUUID(),
      name,
      avatarId,
      birthdate,
      interests,
      spaces,
      vacationStart,
      vacationEnd,
      createdAt: new Date().toISOString(),
    };
    completeWizard(profile, routine);
    navigate(isRelaunch ? '/impostazioni' : '/oggi', { replace: true });
  }

  const variants = reducedMotion ? FADE_VARIANTS : pageFlipVariants;
  const transition = reducedMotion ? { duration: 0.15 } : { duration: 0.35, ease: PAGE_FLIP_EASE };

  const showFooterNav = step > 0 && step < TOTAL_STEPS - 1;
  const showBack = step > entryStep && step < TOTAL_STEPS - 1;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex justify-center gap-2 py-4" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <motion.span
            key={i}
            animate={{ scale: i === step ? 1.4 : 1 }}
            transition={springSoft}
            className={`h-2.5 w-2.5 rounded-full ${i === step ? 'bg-sun' : 'bg-deep/20'}`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="flex flex-1 flex-col"
          >
            {step === 0 && <StepWelcome onNext={goNext} />}
            {step === 1 && (
              <StepName
                name={name}
                onNameChange={setName}
                nameError={nameError}
                avatarId={avatarId}
                onAvatarChange={setAvatarId}
              />
            )}
            {step === 2 && (
              <StepDates
                birthdate={birthdate}
                onBirthdateChange={setBirthdate}
                vacationStart={vacationStart}
                onVacationStartChange={setVacationStart}
                vacationEnd={vacationEnd}
                onVacationEndChange={setVacationEnd}
                ageLabelText={ageLabelText}
                ageWarningText={ageWarningText}
                vacationError={vacationError}
              />
            )}
            {step === 3 && (
              <StepRoutine routine={routine} onRoutineChange={setRoutine} routineError={routineError} />
            )}
            {step === 4 && (
              <StepInterests
                interests={interests}
                onToggleInterest={toggleInterest}
                spaces={spaces}
                onToggleSpace={toggleSpace}
              />
            )}
            {step === 5 && <StepSummary name={name} avatarEmoji={avatarEmoji} onConfirm={handleConfirm} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {showFooterNav && (
        <div className="flex items-center justify-between px-6 pb-8">
          {showBack ? (
            <Button type="button" variant="ghost" onClick={goBack}>
              Indietro
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={goNext} disabled={!canAdvance}>
            Avanti
          </Button>
        </div>
      )}

      {step === TOTAL_STEPS - 1 && showBack && (
        <div className="px-6 pb-4">
          <Button type="button" variant="ghost" onClick={goBack}>
            Indietro
          </Button>
        </div>
      )}
    </div>
  );
}
