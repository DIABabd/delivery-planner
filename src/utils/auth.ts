import { supabase } from './supabase';

// Map username to email format for Supabase Auth (which requires email)
function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@deliveryplanner.app`;
}

export async function login(username: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  return !error;
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function logout() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback: (loggedIn: boolean) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
}