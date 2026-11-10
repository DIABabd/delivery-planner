import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// The old service worker also stored server answers in this cache. The new one
// only stores the app's own files, so the old cache is just wasted space.
if ('caches' in window) {
  caches.delete('route-planner-v2').catch(() => { /* ignore */ });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
