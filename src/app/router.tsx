import { Navigate, createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useApp } from './store';
import { Layout } from './Layout';
import { UiShowcase } from '../features/dev/UiShowcase';
import { WizardPage } from '../features/wizard/WizardPage';

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
 * Segnaposto minimo per le schermate non ancora costruite (Tasks 14/17/19/20
 * possiedono l'implementazione reale). Il testo `"<Nome> (placeholder)"` è
 * distinguibile dalle voci di navigazione di `Layout` (che riportano solo
 * `<Nome>`, senza suffisso) cosi' i test possono asserire sull'uno senza
 * ambiguita' con l'altro.
 *
 * `/oggi` in particolare mostra anche il nome del profilo quando presente:
 * scaffolding minimo per Task 9 (permette al wizard di dimostrare
 * end-to-end che il profilo creato e' quello visibile dopo il redirect),
 * verra' sostituito dalla vera schermata "Oggi" nel Task 14.
 */
function Placeholder({ label }: { label: string }) {
  const profile = useApp((s) => s.profile);
  if (label === 'Oggi' && profile) {
    return (
      <div>
        {label} (placeholder) — ciao <strong data-testid="profile-name">{profile.name}</strong>!
      </div>
    );
  }
  return <div>{label} (placeholder)</div>;
}

/**
 * Tabella delle route (FR-1/FR-5/FR-6/FR-7/FR-8). `/timer` e `/wizard` sono
 * volutamente FUORI dal gruppo con `Layout` come elemento: sono fullscreen,
 * senza tab bar/sidebar. Le altre schermate principali (`/oggi`,
 * `/calendario`, `/impostazioni`) e la pagina di servizio `/dev/ui` sono
 * dentro `Layout`.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <Layout />,
    children: [
      { path: '/oggi', element: <Placeholder label="Oggi" /> },
      { path: '/calendario', element: <Placeholder label="Calendario" /> },
      { path: '/impostazioni', element: <Placeholder label="Impostazioni" /> },
      { path: '/dev/ui', element: <UiShowcase /> },
    ],
  },
  { path: '/timer', element: <Placeholder label="Timer" /> },
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
