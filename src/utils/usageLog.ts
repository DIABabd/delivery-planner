import { supabase } from './supabase';

// Records that the app was opened / resumed / logged into (see
// database/usage-log.sql). The server adds the IP address and country.
//
// Entries wait in a small queue on the phone first, so an "open" that happens
// without signal is not lost — it is sent the next time there is a connection.

export type UsageEvent = 'open' | 'resume' | 'login';

interface QueuedEvent {
  event: UsageEvent;
  at: string;
  details: Record<string, unknown>;
}

const QUEUE_KEY = 'usage-log-queue';
const MAX_QUEUED = 50;

function readQueue(): QueuedEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {
    // Ignore — logging must never get in the way of the app.
  }
}

function deviceDetails(): Record<string, unknown> {
  return {
    // true = opened from the home-screen icon, false = opened in the browser
    installed: window.matchMedia('(display-mode: standalone)').matches,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

let flushing = false;

async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length > 0) {
      const next = queue[0];
      const { error } = await supabase.rpc('log_usage', {
        p_event: next.event,
        p_client_time: next.at,
        p_user_agent: navigator.userAgent,
        p_details: next.details,
      });
      if (error) return; // no signal or not logged in: try again next time
      // Re-read in case something was added while we were sending.
      queue = readQueue().slice(1);
      writeQueue(queue);
    }
  } catch {
    // Ignore.
  } finally {
    flushing = false;
  }
}

export function logUsage(event: UsageEvent) {
  const queue = readQueue();
  queue.push({ event, at: new Date().toISOString(), details: deviceDetails() });
  writeQueue(queue);
  void flush();
}
