import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const HIDDEN_AT_KEY = 'route-planner-hidden-at';
const EXTERNAL_NAV_KEY = 'route-planner-external-nav-at';
const RECOVERY_RELOAD_KEY = 'route-planner-recovery-reload-at';
const LONG_BACKGROUND_MS = 10 * 60 * 1000;
const RELOAD_DEBOUNCE_MS = 30 * 1000;

function readStoredTime(key: string) {
  try {
    const value = Number(sessionStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeStoredTime(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures; recovery is best-effort.
  }
}

function removeStoredTime(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function markHidden() {
  writeStoredTime(HIDDEN_AT_KEY, Date.now());
}

function reloadOnce() {
  const now = Date.now();
  const lastReload = readStoredTime(RECOVERY_RELOAD_KEY);
  if (now - lastReload < RELOAD_DEBOUNCE_MS) return;
  writeStoredTime(RECOVERY_RELOAD_KEY, now);
  window.location.reload();
}

function recoverIfNeeded(restoredFromCache = false) {
  const hiddenAt = readStoredTime(HIDDEN_AT_KEY);
  const externalNavAt = readStoredTime(EXTERNAL_NAV_KEY);
  removeStoredTime(HIDDEN_AT_KEY);
  removeStoredTime(EXTERNAL_NAV_KEY);

  const awaySince = Math.max(hiddenAt, externalNavAt);
  const wasAwayLong = awaySince > 0 && Date.now() - awaySince > LONG_BACKGROUND_MS;
  if (restoredFromCache || wasAwayLong) reloadOnce();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    markHidden();
    return;
  }
  recoverIfNeeded();
});

window.addEventListener('pagehide', markHidden);
window.addEventListener('pageshow', (e) => {
  recoverIfNeeded((e as PageTransitionEvent).persisted);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
