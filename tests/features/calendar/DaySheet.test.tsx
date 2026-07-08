import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DaySheet } from '../../../src/features/calendar/DaySheet';
import { useApp } from '../../../src/app/store';
import { emptyEnvelope } from '../../../src/core/storage/envelope';
import type { ChildProfile, DayPlan } from '../../../src/core/catalog/types';

// Gap colmato dal task: dal Calendario, cliccare una card attività dentro
// DaySheet apre lo stesso popup ActivityDetail di TodayPage, ma le azioni
// devono operare sul giorno mostrato (dateISO), non su "oggi".

const TODAY_ISO = '2026-07-08';
const FUTURE_ISO = '2026-07-10'; // giorno futuro: azioni abilitate
const PAST_ISO = '2026-07-01'; // giorno passato: sola lettura

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Aurora',
    avatarId: 'volpina',
    birthdate: '2023-05-10',
    interests: ['animali'],
    spaces: ['casa'],
    vacationStart: '2026-06-01',
    vacationEnd: '2026-08-31',
    createdAt: '2026-06-01T09:00:00.000Z',
  };
}

function planFixture(dateISO: string): DayPlan {
  return {
    date: dateISO,
    familyDay: false,
    weather: 'sole',
    regenNonce: 0,
    slots: [
      { slotId: 'M1', activityId: 'MOT-01', status: 'planned', swapCount: 0 },
      { slotId: 'M2', activityId: 'MOT-02', status: 'planned', swapCount: 0 },
    ],
  };
}

function seedStore(dateISO: string, plan: DayPlan) {
  const env = emptyEnvelope();
  useApp.setState({
    ...env,
    // reducedMotion 'on': i Modal/Sheet di questi test si chiudono con un
    // fade-out breve e deterministico invece del flip 3D/slide pieno (§9.3),
    // così le asserzioni "not.toBeInTheDocument" post-chiusura (sotto,
    // via `waitFor` — AnimatePresence smonta solo a transizione finita)
    // restano rapide.
    settings: { ...env.settings, reducedMotion: 'on' },
    profile: profileFixture(),
    plans: { [dateISO]: plan },
  });
}

beforeEach(() => {
  localStorage.clear();
});

test('click su una card attività apre ActivityDetail con le info corrette', async () => {
  seedStore(FUTURE_ISO, planFixture(FUTURE_ISO));
  const user = userEvent.setup();
  render(
    <DaySheet dateISO={FUTURE_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[FUTURE_ISO]} onClose={vi.fn()} />,
  );

  await user.click(screen.getByRole('button', { name: /dettagli attività: percorso a ostacoli del salotto/i }));

  // Il popup mostra titolo, "Sviluppa" e i passi della stessa attività.
  expect(screen.getByRole('heading', { name: /percorso a ostacoli del salotto/i })).toBeInTheDocument();
  expect(screen.getByText(/sviluppa:/i)).toBeInTheDocument();
});

test('"Fatta" scrive markSlot sul giorno mostrato (non su "oggi") e chiude il popup', async () => {
  seedStore(FUTURE_ISO, planFixture(FUTURE_ISO));
  const user = userEvent.setup();
  render(
    <DaySheet dateISO={FUTURE_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[FUTURE_ISO]} onClose={vi.fn()} />,
  );

  await user.click(screen.getByRole('button', { name: /dettagli attività: percorso a ostacoli del salotto/i }));
  await user.click(screen.getByRole('button', { name: /fatta/i }));

  // Lo slot M1 del giorno FUTURE_ISO è ora 'done'...
  const updatedPlan = useApp.getState().plans[FUTURE_ISO];
  expect(updatedPlan.slots.find((s) => s.slotId === 'M1')?.status).toBe('done');
  // ...e non è stato creato/alterato alcun piano per "oggi".
  expect(useApp.getState().plans[TODAY_ISO]).toBeUndefined();
  // Il popup si chiude dopo l'azione (AnimatePresence smonta a fine exit).
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /percorso a ostacoli del salotto/i })).not.toBeInTheDocument();
  });
});

test('giorno passato: il popup resta consultabile ma senza azioni che modificano il piano', async () => {
  seedStore(PAST_ISO, planFixture(PAST_ISO));
  const user = userEvent.setup();
  render(
    <DaySheet dateISO={PAST_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[PAST_ISO]} onClose={vi.fn()} />,
  );

  await user.click(screen.getByRole('button', { name: /dettagli attività: percorso a ostacoli del salotto/i }));

  // Il contenuto informativo resta visibile...
  expect(screen.getByRole('heading', { name: /percorso a ostacoli del salotto/i })).toBeInTheDocument();
  expect(screen.getByText(/sviluppa:/i)).toBeInTheDocument();
  // ...ma nessuna azione che modifica il piano è disponibile.
  expect(screen.queryByRole('button', { name: /^fatta/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /saltata/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /cambiala/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /scelgo io/i })).not.toBeInTheDocument();
});

test('Esc chiude prima il popup di dettaglio, un secondo Esc chiude lo sheet', async () => {
  seedStore(FUTURE_ISO, planFixture(FUTURE_ISO));
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <DaySheet dateISO={FUTURE_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[FUTURE_ISO]} onClose={onClose} />,
  );

  await user.click(screen.getByRole('button', { name: /dettagli attività: percorso a ostacoli del salotto/i }));
  expect(screen.getByRole('heading', { name: /percorso a ostacoli del salotto/i })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });
  // Primo Esc: chiude solo il dettaglio, lo sheet esterno resta aperto.
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /percorso a ostacoli del salotto/i })).not.toBeInTheDocument();
  });
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.keyDown(document, { key: 'Escape' });
  // Secondo Esc: ora chiude lo sheet.
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('dopo la chiusura reale dello sheet (resetInnerState), riaprendolo su un altro giorno non mostra popup residui', async () => {
  seedStore(FUTURE_ISO, planFixture(FUTURE_ISO));
  const user = userEvent.setup();
  const { rerender } = render(
    <DaySheet dateISO={FUTURE_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[FUTURE_ISO]} onClose={vi.fn()} />,
  );

  await user.click(screen.getByRole('button', { name: /dettagli attività: percorso a ostacoli del salotto/i }));
  expect(screen.getByRole('heading', { name: /percorso a ostacoli del salotto/i })).toBeInTheDocument();

  // Primo Esc chiude il dettaglio, il secondo chiude davvero lo sheet: solo
  // a quel punto `resetInnerState` azzera `detailSlotId` internamente.
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.keyDown(document, { key: 'Escape' });

  // Il chiamante (CalendarPage) reagirebbe a `onClose` mettendo `dateISO` a
  // `null` e poi eventualmente a un nuovo giorno: qui simuliamo lo stesso
  // giro di props per verificare che non riemerga il vecchio dettaglio.
  rerender(<DaySheet dateISO={null} todayISO={TODAY_ISO} plan={undefined} onClose={vi.fn()} />);
  seedStore(PAST_ISO, planFixture(PAST_ISO));
  rerender(
    <DaySheet dateISO={PAST_ISO} todayISO={TODAY_ISO} plan={useApp.getState().plans[PAST_ISO]} onClose={vi.fn()} />,
  );

  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /percorso a ostacoli del salotto/i })).not.toBeInTheDocument();
  });
});
