// A copy of the last data we got from the server, kept on the phone.
// It lets the app show shops, groups and home instantly after the browser
// restarted the page (which phones do after a long time in Google Maps),
// even before — or without — a network connection.

const PREFIX = 'cache-v1-';

export const CACHE_KEYS = {
  shops: `${PREFIX}shops`,
  groups: `${PREFIX}groups`,
  home: `${PREFIX}home`,
} as const;

export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the cache is only a convenience.
  }
}

export function clearCache() {
  try {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore.
  }
}
