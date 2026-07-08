import { render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { useApp } from '../../../src/app/store';
import { emptyEnvelope } from '../../../src/core/storage/envelope';
import type { ChildProfile } from '../../../src/core/catalog/types';

// Regressione fix Important (review Task 14): l'effect di TodayPage che
// chiama `ensurePlansUpTo` girava anche a vacanza finita (E10), e
// `materializeUpTo` (Task 12) non ha limite superiore — genera e scrive su
// localStorage un DayPlan per ogni giorno da `vacationStart` a "domani",
// una quantità che cresce ogni giorno che passa dopo la fine estate. Questo
// test verifica che, con `vacationEnd` nel passato, il mount di `/oggi` non
// materializzi più nulla.

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Aurora',
    avatarId: 'volpina',
    birthdate: '2023-05-10',
    interests: ['animali'],
    spaces: ['casa'],
    vacationStart: '2026-01-01',
    vacationEnd: '2026-02-01', // finita mesi fa rispetto a "oggi" (fissato sotto)
    createdAt: '2026-01-01T09:00:00.000Z',
  };
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-07-08T10:00:00'));
  useApp.setState({ ...emptyEnvelope(), profile: profileFixture(), plans: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

test('E10: con vacationEnd nel passato, il mount di /oggi non materializza alcun DayPlan', () => {
  render(<App initialEntries={['/oggi']} />);

  // La UI mostra il recap di fine periodo, non la timeline...
  expect(screen.getByText(/che estate/i)).toBeInTheDocument();

  // ...e ensurePlansUpTo non deve essere stato invocato: né lo store né il
  // localStorage sottostante devono contenere DayPlan generati.
  expect(useApp.getState().plans).toEqual({});
  const raw = localStorage.getItem('aurorapp.state.v1');
  if (raw !== null) {
    const saved = JSON.parse(raw) as { plans: Record<string, unknown> };
    expect(saved.plans).toEqual({});
  }
});
