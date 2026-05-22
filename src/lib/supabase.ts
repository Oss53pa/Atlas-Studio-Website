import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing — running in offline/demo mode');
}

/**
 * Supabase client
 *
 * `auth.lock` is overridden with a no-op because the default navigator.locks
 * implementation in @supabase/auth-js occasionally throws
 *   "AbortError: signal is aborted without reason"
 * during initialization (the lock acquire has an internal setTimeout/AbortController
 * that fires when the page is under load or when multiple code paths hit auth
 * concurrently). The error propagates as an uncaught promise rejection and also
 * poisons any in-flight query result with a faux fetchError.
 *
 * Atlas Studio is a single-user admin console + public vitrine — we don't have
 * the multi-tab token refresh race that navigator.locks protects against, so
 * disabling the lock is safe and removes the noise entirely.
 *
 * If you ever need to re-enable it, import `processLock` from @supabase/auth-js
 * and pass it here instead — it uses an in-memory queue instead of navigator.locks.
 */

/**
 * fetch résilient : réessaie sur les erreurs réseau transitoires
 * ("TypeError: Failed to fetch"), fréquentes lors d'un refresh de token
 * Supabase quand la connexion vacille (réveil d'onglet, réseau mobile
 * instable). Un échec réseau signifie que la requête n'a jamais atteint le
 * serveur — la rejouer est donc sûr, même pour un POST. Les annulations
 * volontaires (AbortError) ne sont jamais rejouées.
 */
const FETCH_MAX_RETRIES = 2;
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        Boolean(init?.signal?.aborted);
      if (aborted || attempt === FETCH_MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
        return await fn();
      },
    },
    global: {
      fetch: resilientFetch,
    },
  },
);
