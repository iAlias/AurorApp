import { Navigate, createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useApp } from './store';
import { Layout } from './Layout';
import { UiShowcase } from '../features/dev/UiShowcase';
import { WizardPage } from '../features/wizard/WizardPage';
import { MealTimerPage } from '../features/mealTimer/MealTimerPage';
import { TodayPage } from '../features/today/TodayPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { SettingsPage } from '../features/settings/SettingsPage';

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
 * Tabella delle route (FR-1/FR-5/FR-6/FR-7/FR-8). `/timer` e `/wizard` sono
 * volutamente FUORI dal gruppo con `Layout` come elemento: sono fullscreen,
 * senza tab bar/sidebar. Le altre schermate principali (`/oggi`,
 * `/calendario`, `/impostazioni`) e la pagina di servizio `/dev/ui` sono
 * dentro `Layout`. `/impostazioni` e' `SettingsPage` (Task 20: FR-8 completa
 * + recap progressi FR-9), che chiude la Milestone M6.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <Layout />,
    children: [
      { path: '/oggi', element: <TodayPage /> },
      { path: '/calendario', element: <CalendarPage /> },
      { path: '/impostazioni', element: <SettingsPage /> },
      { path: '/dev/ui', element: <UiShowcase /> },
    ],
  },
  { path: '/timer', element: <MealTimerPage /> },
  { path: '/wizard', element: <WizardPage /> },
];

/**
 * Crea il router applicativo. In produzione (`initialEntries` assente) usa
 * la history del browser reale; nei test, passare `initialEntries` fa usare
 * `createMemoryRouter` cosi' non si dipende dalla history API del browser
 * ne' dall'URL corrente di jsdom.
 */
export function createAppRouter(initialEntries?: string[]) {
  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
