import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { useApp } from '../../app/store';
import { ACTIVITIES } from '../../core/catalog/activities';
import { CATEGORIES } from '../../core/catalog/categories';
import { BADGES, doneByCategory } from '../../core/progress/badges';
import type { BadgeId, CategoryId, DayPlan } from '../../core/catalog/types';
import { Card } from '../../ui/Card';
import { audioManager } from '../../ui/audio';
import { burst } from '../../ui/confetti';
import { useReducedMotionPref } from '../../ui/motion';
import { usePersonalize } from '../../app/usePersonalize';

interface WeeklyRecap {
  weekStartISO: string;
  weekEndISO: string;
  activitiesDone: number;
  topCategory: CategoryId | null;
  newBadges: BadgeId[];
}

/**
 * Recap "ultimo lunedì–domenica completo" (FR-9): la settimana PRIMA di
 * quella in corso, mai quella corrente (che non è ancora finita). Riusa
 * `doneByCategory` (Task 18) filtrando i piani alla sola finestra di 7
 * giorni, invece di duplicarne la logica di risoluzione categoria.
 */
function computeWeeklyRecap(
  plans: Record<string, DayPlan>,
  badges: Partial<Record<BadgeId, string>>,
  todayISO: string,
): WeeklyRecap {
  const thisMonday = startOfWeek(parseISO(todayISO), { weekStartsOn: 1 });
  const lastMonday = subDays(thisMonday, 7);
  const lastSunday = subDays(thisMonday, 1);
  const weekStartISO = format(lastMonday, 'yyyy-MM-dd');
  const weekEndISO = format(lastSunday, 'yyyy-MM-dd');

  const weekPlans: Record<string, DayPlan> = {};
  for (let i = 0; i < 7; i++) {
    const iso = format(addDays(lastMonday, i), 'yyyy-MM-dd');
    const plan = plans[iso];
    if (plan) weekPlans[iso] = plan;
  }

  const catCounts = doneByCategory(weekPlans, ACTIVITIES);
  const activitiesDone = Object.values(catCounts).reduce((sum, n) => sum + n, 0);
  const topEntry = (Object.entries(catCounts) as [CategoryId, number][]).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topEntry && topEntry[1] > 0 ? topEntry[0] : null;

  const newBadges = (Object.entries(badges) as [BadgeId, string][])
    .filter(([, unlockedAt]) => {
      const day = unlockedAt.slice(0, 10);
      return day >= weekStartISO && day <= weekEndISO;
    })
    .map(([id]) => id);

  return { weekStartISO, weekEndISO, activitiesDone, topCategory, newBadges };
}

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Card "I tuoi progressi" (FR-9), mostrata in Impostazioni: streak, griglia
 * badge (13, grigi/opachi finché non sbloccati), attività fatte per
 * categoria, recap dell'ultima settimana completa. I badge presenti in
 * `lastNewBadges` al mount (sbloccati dall'azione appena precedente, es. un
 * "Fatta!" in Oggi che ha fatto scattare una soglia) ricevono il flip 3D di
 * sblocco una tantum: lo snapshot iniziale (`useState`, non ricalcolato)
 * evita che il flip riparta ad ogni render, e `clearNewBadges` consuma il
 * canale effimero dopo averlo letto (stesso contratto di `store.ts`).
 */
export function ProgressCard() {
  const progress = useApp((s) => s.progress);
  const plans = useApp((s) => s.plans);
  const lastNewBadges = useApp((s) => s.lastNewBadges);
  const reducedMotion = useReducedMotionPref();
  const g = usePersonalize();

  const [justUnlocked] = useState<Set<BadgeId>>(() => new Set(lastNewBadges));

  useEffect(() => {
    if (lastNewBadges.length === 0) return;
    // Delight one-shot allo sblocco (oltre al flip 3D delle card badge, già
    // gestito nel JSX sotto): stesso guard `meals.soundsOn` di tutti gli
    // altri suoni dell'app, `burst()` è già no-op sotto reduced-motion.
    if (useApp.getState().settings.meals.soundsOn) audioManager.play('badge');
    burst();
    useApp.getState().clearNewBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consumo one-shot al mount, non ad ogni cambio
  }, []);

  const recap = useMemo(() => computeWeeklyRecap(plans, progress.badges, todayISO()), [plans, progress.badges]);

  const categoryEntries = (Object.entries(progress.doneByCategory) as [CategoryId, number][]).filter(
    ([, n]) => n > 0,
  );

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-deep">I tuoi progressi</h2>

      <p className="font-body text-deep" data-testid="progress-streak">
        🔥 Streak: {progress.streak} {progress.streak === 1 ? 'giorno' : 'giorni'}
      </p>

      <div>
        <p className="mb-2 font-body text-sm font-semibold text-stone">Badge</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" data-testid="badge-grid" style={{ perspective: 800 }}>
          {BADGES.map((b) => {
            const unlocked = progress.badges[b.id] !== undefined;
            const flip = justUnlocked.has(b.id) && !reducedMotion;
            return (
              <motion.div
                key={b.id}
                title={`${g(b.name)} — ${g(b.description)}`}
                data-testid={`badge-${b.id}`}
                data-unlocked={unlocked}
                initial={flip ? { rotateY: 180, opacity: 0 } : false}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: reducedMotion ? 0.15 : 0.6 }}
                className={[
                  'flex flex-col items-center gap-1 rounded-card p-2 text-center',
                  unlocked ? 'bg-sun/20' : 'bg-deep/5 opacity-40 grayscale',
                ].join(' ')}
              >
                <span className="text-2xl" aria-hidden="true">
                  {b.emoji}
                </span>
                <span className="font-body text-[10px] leading-tight text-deep">{g(b.name)}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-body text-sm font-semibold text-stone">Attività fatte per categoria</p>
        {categoryEntries.length === 0 ? (
          <p className="font-body text-xs text-stone">Ancora nessuna attività segnata come fatta.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryEntries.map(([cat, n]) => (
              <span key={cat} className="rounded-full bg-cream px-3 py-1 font-body text-xs text-deep">
                {CATEGORIES[cat].emoji} {CATEGORIES[cat].name}: {n}
              </span>
            ))}
          </div>
        )}
      </div>

      <div data-testid="weekly-recap" className="rounded-card bg-sky/10 p-3">
        <p className="font-display text-sm text-deep">Settimana scorsa</p>
        {recap.activitiesDone === 0 ? (
          <p className="font-body text-xs text-stone">Nessuna attività registrata la settimana scorsa.</p>
        ) : (
          <>
            <p className="font-body text-xs text-stone">{recap.activitiesDone} attività fatte insieme</p>
            {recap.topCategory && (
              <p className="font-body text-xs text-stone">
                Categoria preferita: {CATEGORIES[recap.topCategory].name}
              </p>
            )}
            {recap.newBadges.length > 0 && (
              <p className="font-body text-xs text-stone">
                Nuovi badge: {recap.newBadges.map((id) => BADGES.find((b) => b.id === id)?.emoji).join(' ')}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
