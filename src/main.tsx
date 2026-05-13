import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// If the page is restored from the browser's back-forward cache (e.g. user
// returns from Google Maps after a long time), force a fresh load. Stale JS
// state + an expired Supabase token are the main cause of the blank-screen bug.
window.addEventListener('pageshow', (e) => {
  if ((e as PageTransitionEvent).persisted) window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
