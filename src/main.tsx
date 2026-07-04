import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';
import './styles/tailwind.css';
import App from './App';
import { initPersistence } from './app/store';

// Da chiamare una sola volta all'avvio reale dell'app (non nei test, che
// montano <App/> direttamente): collega il debounce di salvataggio e la
// re-idratazione cross-tab (Task 5).
initPersistence();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
