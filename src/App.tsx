import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './app/router';

export interface AppProps {
  /** Solo per i test: forza `MemoryRouter` invece della history del browser reale. */
  initialEntries?: string[];
}

export default function App({ initialEntries }: AppProps = {}) {
  const router = useMemo(() => createAppRouter(initialEntries), [initialEntries]);
  return <RouterProvider router={router} />;
}
