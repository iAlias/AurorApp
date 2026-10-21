import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useApp } from './store';
import { Layout } from './Layout';
import { WizardPage } from '../features/wizard/WizardPage';
import { TodayPage } from '../features/today/TodayPage';
import { RouteLoading } from './RouteLoading';

/**
 * `/impostazioni`, `/timer`, `/catalogo`, `/giochi` e la pagina di servizio `/dev/ui`
 * non sono la prima cosa vista dall'utente all'avvio (quella e' `/oggi` o
 * `/wizard`, che restano import statici) — sono caricate pigramente
 * (Task 22, §M7 performance) cosi' il bundle iniziale non le include.
 * `Suspense` con `RouteLoading` (spinner a tema sole) copre il breve
 * intervallo di rete/parsing del chunk mentre arriva.
 */
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const MealTimerPage = lazy(() =>
  import('../features/mealTimer/MealTimerPage').then((m) => ({ default: m.MealTimerPage })),
);
const CatalogPage = lazy(() =>
  import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const GamesPage = lazy(() =>
  import('../features/games/GamesPage').then((m) => ({ default: m.GamesPage })),
);
const UiShowcase = lazy(() =>
  import('../features/dev/UiShowcase').then((m) => ({ default: m.UiShowcase })),
);

function withSuspense(element: JSX.Element): JSX.Element {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

/**
 * `/` non ha un contenuto proprio (FR-1/FR-5): reindirizza subito a `/oggi`
 * se il wizard e' gia' stato completato (`profile` non nullo), altrimenti a
 * `/wizard`. Legge lo store in modo reattivo — se `profile` cambia mentre
 * questo componente e' montato (caso raro: si arriva su `/` solo di
 * passaggio, `replace` non lascia voci in history) il redirect si ricalcola.
 */
function RootRedirect() {
  const profile = useApp((s) => s.profile);
  return <Navigate to={profile ? '/oggi' : '/wizard'} replace />;
}

/**
 * Tabella delle route (FR-1/FR-5/FR-6/FR-7/FR-8). Solo `/wizard` e'
 * volutamente FUORI dal gruppo con `Layout` come elemento: e' fullscreen,
 * senza tab bar/sidebar. Le altre schermate principali (`/oggi`,
 * `/timer`, `/impostazioni`, …) e la pagina di servizio `/dev/ui`
 * sono dentro `Layout`, cosi' la tab bar/sidebar resta visibile anche
 * durante il timer del pasto (`/timer` resta fullscreen nel proprio
 * contenuto/sfondo, ma con la navigazione principale sempre raggiungibile).
 * `/impostazioni` e' `SettingsPage` (Task 20: FR-8 completa + recap
 * progressi FR-9), che chiude la Milestone M6.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <Layout />,
    children: [
      { path: '/oggi', element: <TodayPage /> },
      { path: '/timer', element: withSuspense(<MealTimerPage />) },
      { path: '/impostazioni', element: withSuspense(<SettingsPage />) },
      { path: '/catalogo', element: withSuspense(<CatalogPage />) },
      { path: '/giochi/:gameId?', element: withSuspense(<GamesPage />) },
      // Pagina di servizio del design system: solo in sviluppo, mai nell'app pubblicata.
      ...(import.meta.env.DEV ? [{ path: '/dev/ui', element: withSuspense(<UiShowcase />) }] : []),
    ],
  },
  { path: '/wizard', element: <WizardPage /> },
];

/**
 * Crea il router applicativo. In produzione (`initialEntries` assente) usa
 * la history del browser reale; nei test, passare `initialEntries` fa usare
 * `createMemoryRouter` cosi' non si dipende dalla history API del browser
 * ne' dall'URL corrente di jsdom.
 */
export function createAppRouter(initialEntries?: string[]) {
  // `BASE_URL` riflette `base` in vite.config.ts (es. '/arcobimbi/'): serve
  // solo al router del browser reale — i test usano `createMemoryRouter`
  // con percorsi assoluti indipendenti dalla sottocartella di deploy.
  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
}
