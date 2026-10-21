import { render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { useApp } from '../../../src/app/store';
import { emptyEnvelope } from '../../../src/core/storage/envelope';
import type { ChildProfile } from '../../../src/core/catalog/types';

// L'app si usa tutto l'anno, senza un periodo di vacanza: aprendo /oggi si
// generano solo oggi e domani, mai i giorni passati in cui l'app non è stata
// aperta (altrimenti i piani crescerebbero senza limite e quei giorni mai
// visti "consumerebbero" attività per la regola anti-ripetizione).

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Sofia',
    avatarId: 'volpina', gender: 'f',
    birthdate: '2023-05-10',
    interests: ['animali'],
    spaces: ['casa'],
    createdAt: '2026-01-01T09:00:00.000Z', // profilo creato mesi prima di "oggi"
  };
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-07-08T10:00:00'));
  useApp.setState({ ...emptyEnvelope(), profile: profileFixture(), plans: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

test('il mount di /oggi genera solo oggi e domani, mai i giorni passati', () => {
  render(<App initialEntries={['/oggi']} />);

  expect(screen.getByRole('group', { name: /meteo di oggi/i })).toBeInTheDocument();
  expect(Object.keys(useApp.getState().plans).sort()).toEqual(['2026-07-08', '2026-07-09']);
});
