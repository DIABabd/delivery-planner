const VALID_HASH = 'b79e885b8738701289d506b9bb5d0fb808929214ee55238f9c81df3caa746f9d';
const SESSION_KEY = 'dp_auth';

async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function login(username: string, password: string): Promise<boolean> {
  const hash = await sha256(username.toLowerCase().trim() + ':' + password);
  if (hash === VALID_HASH) {
    localStorage.setItem(SESSION_KEY, hash);
    return true;
  }
  return false;
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === VALID_HASH;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
