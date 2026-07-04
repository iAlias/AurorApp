import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/app/router';
import { useApp } from '../../src/app/store';
import type { ChildProfile } from '../../src/core/catalog/types';

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Aurora',
    avatarId: 'volpina',
    birthdate: '2023-05-10',
    interests: ['animali'],
    spaces: ['casa'],
    vacationStart: '2026-07-01',
    vacationEnd: '2026-08-31',
    createdAt: '2026-07-04T09:00:00.000Z',
  };
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  useApp.setState({ profile: null });
});

describe('router: "/" redirect (FR-1)', () => {
  test('senza profilo, "/" reindirizza a /wizard', () => {
    renderAt('/');
    expect(screen.getByText(/Wizard \(placeholder\)/i)).toBeInTheDocument();
  });

  test('con profilo, "/" reindirizza a /oggi', () => {
    useApp.setState({ profile: profileFixture() });
    renderAt('/');
    expect(screen.getByText(/Oggi \(placeholder\)/i)).toBeInTheDocument();
  });
});

describe('/dev/ui', () => {
  test('renderizza componenti del kit UI (smoke)', () => {
    renderAt('/dev/ui');
    expect(screen.getByText('Primario')).toBeInTheDocument();
    expect(screen.getByText(/Animali/)).toBeInTheDocument();
    expect(screen.getByLabelText(/sveglia/i)).toBeInTheDocument();
    expect(screen.getByText(/Apri Modal/i)).toBeInTheDocument();
    expect(screen.getByText(/Apri Sheet/i)).toBeInTheDocument();
  });
});
