import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito';
import './styles/tailwind.css';
import App from './App';
import { initPersistence } from './app/store';

// Da chiamare una sola volta all'avvio reale dell'app (non nei test, che
// montano <App/> direttamente): collega il debounce di salvataggio e la
// re-idratazione cross-tab (Task 5).
initPersistence();

// App Android: il tasto/gesto "indietro" torna alla schermata precedente;
// dalla prima schermata manda l'app in background invece di chiuderla.
if (Capacitor.isNativePlatform()) {
  void NativeApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void NativeApp.minimizeApp();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
