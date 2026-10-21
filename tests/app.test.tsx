import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { useApp } from '../src/app/store';
import type { ChildProfile } from '../src/core/catalog/types';

// Task 1 introduceva App come placeholder statico (`<h1>Arcobimbi</h1>`) senza
// routing. Task 7 lo sostituisce con il vero shell di navigazione
// (RouterProvider): questo test è stato aggiornato di conseguenza — non più
// un render nudo, ma uno smoke test end-to-end dell'App reale (store +
// router + Layout), passando `initialEntries` per usare MemoryRouter invece
// della history del browser. Il testo "Arcobimbi" (branding, ora nella
// sidebar di `Layout`) resta verificato, cosi' come il comportamento di
// redirect da Task 7.

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

beforeEach(() => {
  useApp.setState({ profile: null });
  // "Oggi" dentro la vacanza del fixture: con la data reale, a vacanza finita
  // /oggi mostrerebbe il riepilogo di fine estate invece della giornata.
  vi.setSystemTime(new Date('2026-07-10T10:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('con profilo, App mostra il brand Arcobimbi e reindirizza a Oggi', () => {
  useApp.setState({ profile: profileFixture() });
  render(<App initialEntries={['/']} />);

  expect(screen.getByText(/Arcobimbi/)).toBeInTheDocument();
  // Task 14: /oggi è ora la vera TodayPage (non più il placeholder) — il
  // selettore meteo è un marcatore stabile della sua presenza.
  expect(screen.getByRole('group', { name: /meteo di oggi/i })).toBeInTheDocument();
});

test('senza profilo, App reindirizza al wizard', () => {
  render(<App initialEntries={['/']} />);

  expect(screen.getByRole('button', { name: /iniziamo/i })).toBeInTheDocument();
});
