import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/app/router';
import { useApp } from '../../src/app/store';
import type { ChildProfile } from '../../src/core/catalog/types';

function profileFixture(): ChildProfile {
  return {
    id: 'child-1',
    name: 'Sofia',
    avatarId: 'volpina', gender: 'f',
    birthdate: '2023-05-10',
    interests: ['animali'],
    spaces: ['casa'],
    createdAt: '2026-07-04T09:00:00.000Z',
  };
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  useApp.setState({ profile: null });
  // "Oggi" dentro la vacanza del fixture: con la data reale, a vacanza finita
  // /oggi mostrerebbe il riepilogo di fine estate invece della giornata.
  vi.setSystemTime(new Date('2026-07-10T10:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('router: "/" redirect (FR-1)', () => {
  test('senza profilo, "/" reindirizza a /wizard', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: /iniziamo/i })).toBeInTheDocument();
  });

  test('con profilo, "/" reindirizza a /oggi', () => {
    useApp.setState({ profile: profileFixture() });
    renderAt('/');
    // Task 14: /oggi è ora la vera TodayPage (non più il placeholder) — il
    // selettore meteo è un marcatore stabile della sua presenza.
    expect(screen.getByRole('group', { name: /meteo di oggi/i })).toBeInTheDocument();
  });
});

describe('/catalogo', () => {
  test('la voce di menu "Catalogo" porta alla pagina del catalogo completo', async () => {
    useApp.setState({ profile: profileFixture() });
    renderAt('/oggi');

    const bottomNav = screen.getByRole('navigation', { name: /navigazione principale/i });
    await userEvent.setup().click(within(bottomNav).getByRole('link', { name: /catalogo/i }));

    expect(await screen.findAllByTestId('catalog-item')).not.toHaveLength(0);
  });
});

describe('/dev/ui', () => {
  test('renderizza componenti del kit UI (smoke)', async () => {
    renderAt('/dev/ui');
    // Task 22: `/dev/ui` e' ora lazy (`React.lazy` + `Suspense`) — il
    // contenuto arriva dopo il chunk dinamico, quindi `findBy*` (che
    // attende) al posto di `getBy*` (sincrono).
    expect(await screen.findByText('Primario')).toBeInTheDocument();
    expect(screen.getByText(/Animali/)).toBeInTheDocument();
    expect(screen.getByLabelText(/sveglia/i)).toBeInTheDocument();
    expect(screen.getByText(/Apri Modal/i)).toBeInTheDocument();
    expect(screen.getByText(/Apri Sheet/i)).toBeInTheDocument();
  });
});
