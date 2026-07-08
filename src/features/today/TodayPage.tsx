import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { useToday } from '../../app/useToday';
import { CATEGORIES } from '../../core/catalog/categories';
import { ACTIVITIES } from '../../core/catalog/activities';
import { deriveSlots, toMin } from '../../core/planner/slots';
import type { SlotDef } from '../../core/planner/slots';
import type {
  CategoryId,
  ChildProfile,
  DayPlan,
  MealSettings,
  PlannedSlot,
  ProgressState,
  RoutineSettings,
  SlotId,
} from '../../core/catalog/types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { springSoft, useReducedMotionPref } from '../../ui/motion';
import { burst } from '../../ui/confetti';
import { audioManager } from '../../ui/audio';
import { AVATARS } from '../wizard/wizardLogic';
import { AnchorPill } from './AnchorPill';
import { SlotCard } from './SlotCard';
import { ActivityDetail } from './ActivityDetail';
import { WeatherSelector } from './WeatherSelector';
import { MealCard } from './MealCard';
import { TomorrowPreview } from './TomorrowPreview';

const SPECIAL_LABELS: Record<'mare' | 'nonni' | 'viaggio' | 'altro', string> = {
  mare: 'giornata al mare',
  nonni: 'giornata dai nonni',
  viaggio: 'in viaggio',
  altro: 'giornata speciale',
};

const TOAST_DURATION_MS = 3500;

/** Saluto contestuale sulla fascia oraria corrente (FR-5). */
function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Buongiorno! ☀️';
  if (h < 18) return 'Buon pomeriggio!';
  return 'Buonasera! 🌙';
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ——— Timeline: ancore fisse + slot generati, in ordine cronologico ———

type TimelineItem =
  | { kind: 'anchor'; key: string; label: string; startMin: number; endMin: number }
  | { kind: 'slot'; key: string; slot: PlannedSlot; def: SlotDef }
  | { kind: 'meal'; key: string; meal: 'pranzo' | 'cena'; startMin: number };

/**
 * Costruisce la timeline del giorno intrecciando le ancore della routine
 * (FR-2, orari fissi non generati) con gli slot attività effettivamente
 * presenti nel piano (5 feriali, 2 in un giorno familiare). Costruita già in
 * ordine cronologico: nessun sort successivo necessario.
 */
function buildTimeline(routine: RoutineSettings, meals: MealSettings, plan: DayPlan): TimelineItem[] {
  const defs = deriveSlots(routine, meals, plan.familyDay);
  const defBySlotId = new Map(defs.map((d) => [d.slotId, d] as const));
  const slotBySlotId = new Map(plan.slots.map((s) => [s.slotId, s] as const));

  function slotItem(id: SlotId): TimelineItem | null {
    const def = defBySlotId.get(id);
    const slot = slotBySlotId.get(id);
    if (!def || !slot) return null;
    return { kind: 'slot', key: id, slot, def };
  }

  const items: TimelineItem[] = [];
  items.push({
    kind: 'anchor',
    key: 'colazione',
    label: 'Sveglia e colazione',
    startMin: toMin(routine.wakeTime),
    endMin: toMin(routine.breakfastEnd),
  });

  const m1 = slotItem('M1');
  if (m1) items.push(m1);

  items.push({
    kind: 'anchor',
    key: 'merenda-mattina',
    label: 'Merenda',
    startMin: toMin(routine.morningSnackStart),
    endMin: toMin(routine.morningSnackEnd),
  });

  const m2 = slotItem('M2');
  if (m2) items.push(m2);

  items.push({ kind: 'meal', key: 'pranzo', meal: 'pranzo', startMin: toMin(routine.lunchStart) });

  const napStart = toMin(routine.napStart);
  items.push({
    kind: 'anchor',
    key: 'riposino',
    label: 'Riposino',
    startMin: napStart,
    endMin: napStart + routine.napMinutes,
  });

  items.push({
    kind: 'anchor',
    key: 'merenda-pomeriggio',
    label: 'Risveglio dolce e merenda',
    startMin: napStart + routine.napMinutes,
    endMin: toMin(routine.afternoonSnackEnd),
  });

  const p1 = slotItem('P1');
  if (p1) items.push(p1);

  const p2 = slotItem('P2');
  if (p2) items.push(p2);

  const dinnerStart = toMin(routine.dinnerStart);
  items.push({
    kind: 'anchor',
    key: 'bagnetto',
    label: 'Bagnetto e relax',
    startMin: dinnerStart - routine.preDinnerMinutes,
    endMin: dinnerStart,
  });

  items.push({ kind: 'meal', key: 'cena', meal: 'cena', startMin: dinnerStart });

  const sera = slotItem('SERA');
  if (sera) items.push(sera);

  const bedMin = toMin(routine.bedTime);
  items.push({ kind: 'anchor', key: 'nanna', label: 'Nanna', startMin: bedMin, endMin: bedMin });

  return items;
}

function itemStartMin(item: TimelineItem): number {
  return item.kind === 'anchor' ? item.startMin : item.kind === 'meal' ? item.startMin : item.def.startMin;
}

/** Riga statica (nessuna animazione infinita fuori dal timer, §9.3/NFR-1). */
function NowIndicator() {
  return (
    <div className="my-1 flex items-center gap-2" aria-hidden="true" data-testid="now-indicator">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />
      <span className="h-px flex-1 bg-coral/50" />
    </div>
  );
}

function SpecialDayCard({ special }: { special: NonNullable<DayPlan['special']> }) {
  const label = special.label ?? SPECIAL_LABELS[special.kind];
  return (
    <Card className="text-center">
      <p className="font-display text-2xl text-deep">Oggi: {label}! 🏖</p>
    </Card>
  );
}

/** Recap di fine periodo (E10): mostrato quando `todayISO > vacationEnd`. */
function EndOfSummary({ profile, plans, progress }: { profile: ChildProfile; plans: Record<string, DayPlan>; progress: ProgressState }) {
  const navigate = useNavigate();

  const fullDays = Object.values(plans).filter(
    (p) => p.slots.filter((s) => s.status === 'done').length >= 2,
  ).length;

  const categoryEntries = Object.entries(progress.doneByCategory) as [CategoryId, number][];
  const topEntry = categoryEntries.sort((a, b) => b[1] - a[1])[0];
  const topCategoryName = topEntry && topEntry[1] > 0 ? CATEGORIES[topEntry[0]].name : null;
  const badgeCount = Object.keys(progress.badges).length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-6 py-10 text-center">
      <h1 className="font-display text-3xl text-deep">Che estate! 🎉</h1>
      <p className="font-body text-stone">Ecco cosa avete fatto insieme, {profile.name}:</p>

      <div className="flex w-full max-w-xs flex-col gap-2 rounded-card bg-card p-6 text-left shadow-soft">
        <p className="font-body text-deep">🗓️ Giorni pieni: {fullDays}</p>
        {topCategoryName && <p className="font-body text-deep">🏆 Categoria preferita: {topCategoryName}</p>}
        <p className="font-body text-deep">⭐ Badge sbloccati: {badgeCount}</p>
        <p className="font-body text-deep">🌈 Pasti sereni: {progress.mealTimersCompleted}</p>
      </div>

      <Button type="button" size="xl" onClick={() => navigate('/wizard')}>
        Prepara una nuova avventura
      </Button>
    </div>
  );
}

/**
 * Schermata "Oggi" (FR-5), la vista principale dell'app. Materializza sempre
 * fino a domani incluso (`ensurePlansUpTo`, che genera anche oggi in un solo
 * giro grazie all'ordine cronologico di Task 12) cosi' la sezione "Domani"
 * ha sempre un piano pronto. Se il periodo vacanza e' finito (E10) non
 * renderizza affatto la timeline: mostra `EndOfSummary`.
 */
export function TodayPage() {
  const profile = useApp((s) => s.profile);
  const plans = useApp((s) => s.plans);
  const progress = useApp((s) => s.progress);
  const settings = useApp((s) => s.settings);
  const { todayISO } = useToday();
  const reducedMotion = useReducedMotionPref();

  const tomorrowISO = useMemo(() => format(addDays(parseISO(todayISO), 1), 'yyyy-MM-dd'), [todayISO]);

  useEffect(() => {
    if (!profile) return;
    useApp.getState().ensurePlansUpTo(tomorrowISO);
  }, [profile, tomorrowISO]);

  const [detailSlotId, setDetailSlotId] = useState<SlotId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasScrolledRef = useRef(false);
  const slotRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  const plan = profile ? plans[todayISO] : undefined;

  const timeline = useMemo(() => {
    if (!profile || !plan || plan.special) return [];
    return buildTimeline(settings.routine, settings.meals, plan);
  }, [profile, plan, settings.routine, settings.meals]);

  useEffect(() => {
    if (hasScrolledRef.current || timeline.length === 0) return;
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const target = timeline.find((item) => item.kind === 'slot' && item.def.endMin > currentMin);
    if (!target) return;
    const el = slotRefs.current.get(target.key);
    // jsdom (test) non implementa scrollIntoView: guardia esplicita così i
    // test unit non vanno in errore, oltre al normale caso "elemento non
    // ancora montato".
    el?.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    hasScrolledRef.current = true;
  }, [timeline, reducedMotion]);

  if (!profile) return <Navigate to="/wizard" replace />;

  if (todayISO > profile.vacationEnd) {
    return <EndOfSummary profile={profile} plans={plans} progress={progress} />;
  }

  if (!plan) return null; // ensurePlansUpTo materializza al prossimo giro di render

  function handleMarkDone(slotId: SlotId) {
    useApp.getState().markSlot(todayISO, slotId, 'done');
    burst();
    audioManager.unlock();
    if (useApp.getState().settings.meals.soundsOn) audioManager.play('done-day');
  }

  function handleSwap(slotId: SlotId) {
    const { exhausted } = useApp.getState().swapSlot(todayISO, slotId);
    if (exhausted) showToast('Le ho provate quasi tutte! Questa è la mia preferita per oggi 😊');
  }

  function openDetail(slotId: SlotId) {
    setDetailSlotId(slotId);
  }

  const detailSlot = detailSlotId ? (plan?.slots.find((s) => s.slotId === detailSlotId) ?? null) : null;
  const detailActivity = detailSlot ? (ACTIVITIES.find((a) => a.id === detailSlot.activityId) ?? null) : null;

  const doneCount = plan.slots.filter((s) => s.status === 'done').length;
  const tomorrowPlan = plans[tomorrowISO];

  const currentMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowIndex = timeline.findIndex((item) => itemStartMin(item) > currentMin);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 pb-24">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-deep">{greeting(new Date())}</h1>
          <div className="flex items-center gap-2">
            <span data-testid="profile-name" className="font-display text-lg text-deep">
              {profile.name}
            </span>
            <span className="text-3xl" aria-hidden="true">
              {AVATARS.find((a) => a.id === profile.avatarId)?.emoji ?? '⭐'}
            </span>
          </div>
        </div>
        <p className="font-body text-sm text-stone">
          {capitalize(format(parseISO(todayISO), 'EEE d MMMM', { locale: it }))} · Giorno{' '}
          {differenceInCalendarDays(parseISO(todayISO), parseISO(profile.vacationStart)) + 1} di{' '}
          {differenceInCalendarDays(parseISO(profile.vacationEnd), parseISO(profile.vacationStart)) + 1}
        </p>
        <WeatherSelector weather={plan.weather} onChange={(w) => useApp.getState().setWeather(todayISO, w)} />
        <p className="font-body text-sm font-semibold text-deep">🔥 Streak: {progress.streak} giorni</p>
      </header>

      {plan.familyDay && !plan.special && (
        <div className="w-fit rounded-full bg-sky/20 px-4 py-1.5 font-display text-sm font-bold text-deep">
          Weekend in famiglia 👨‍👩‍👧
        </div>
      )}

      {plan.special ? (
        <SpecialDayCard special={plan.special} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {timeline.map((item, idx) => {
              // La chiave include activityId+status per gli slot: un cambio
              // (swap, rigenerazione da meteo, done/skipped) smonta e
              // rimonta il nodo, così l'`initial→animate` di sotto riparte
              // — è lo stagger "visibile" richiesto dal brief per il
              // cambio meteo, senza bisogno di uno stato di transizione ad hoc.
              const remountKey =
                item.key + (item.kind === 'slot' ? `-${item.slot.activityId}-${item.slot.status}` : '');
              return (
                <div key={remountKey}>
                  {idx === nowIndex && <NowIndicator />}
                  <motion.div
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ ...springSoft, delay: reducedMotion ? 0 : idx * 0.06 }}
                  >
                    {item.kind === 'anchor' && (
                      <AnchorPill label={item.label} startMin={item.startMin} endMin={item.endMin} />
                    )}
                    {item.kind === 'meal' && <MealCard meal={item.meal} startMin={item.startMin} />}
                    {item.kind === 'slot' &&
                      (() => {
                        const activity = ACTIVITIES.find((a) => a.id === item.slot.activityId);
                        if (!activity) return null;
                        return (
                          <SlotCard
                            slot={item.slot}
                            def={item.def}
                            activity={activity}
                            onMarkDone={() => handleMarkDone(item.slot.slotId)}
                            onSwap={() => handleSwap(item.slot.slotId)}
                            onOpenDetail={() => openDetail(item.slot.slotId)}
                            innerRef={(el) => {
                              if (el) slotRefs.current.set(item.key, el);
                              else slotRefs.current.delete(item.key);
                            }}
                          />
                        );
                      })()}
                  </motion.div>
                </div>
              );
            })}
            {nowIndex === -1 && timeline.length > 0 && <NowIndicator />}
          </div>

          {doneCount >= 2 && (
            <Card className="bg-sun/20 text-center">
              <p className="font-display text-xl text-deep">Giornata piena! ⭐</p>
              <p className="font-body text-sm text-stone">
                Avete fatto {doneCount} attività insieme oggi!
              </p>
            </Card>
          )}
        </>
      )}

      <TomorrowPreview plan={tomorrowPlan} onRegenerate={() => useApp.getState().regenerate(tomorrowISO)} />

      <ActivityDetail
        open={detailSlotId !== null}
        activity={detailActivity}
        slot={detailSlot}
        onClose={() => setDetailSlotId(null)}
        onMarkDone={() => {
          if (detailSlotId) handleMarkDone(detailSlotId);
          setDetailSlotId(null);
        }}
        onMarkSkipped={() => {
          if (detailSlotId) useApp.getState().markSlot(todayISO, detailSlotId, 'skipped');
          setDetailSlotId(null);
        }}
        onSwap={() => {
          if (detailSlotId) handleSwap(detailSlotId);
          setDetailSlotId(null);
        }}
      />

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-40 rounded-card bg-deep px-4 py-3 text-center font-body text-sm font-semibold text-cream shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
}
