import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker so the installed (PWA) version works offline.
// Skipped in dev: Vite serves fresh modules and a stale cache would confuse HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Enregistré immédiatement (et non au `load`) : Chrome n'émet
  // `beforeinstallprompt` qu'une fois le service worker actif, l'attendre
  // retardait l'installation sur les connexions lentes.
  navigator.serviceWorker
    .register('/sw.js')
    .catch((error) => console.error('Service worker registration failed:', error));
}
