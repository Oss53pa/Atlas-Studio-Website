import { supabase } from '../supabase';

/**
 * Atlas Error Monitor SDK
 *
 * Tracking d'erreurs maison pour les apps Atlas Studio.
 * - Aucune dépendance externe
 * - Silencieux : un captureError qui échoue ne fait JAMAIS crasher l'app
 * - Dédoublonnage côté serveur par fingerprint
 */

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ErrorPayload {
  message: string;
  stack?: string;
  component?: string;
  context?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

interface MonitorConfig {
  appId: string;
  environment: 'production' | 'staging' | 'dev';
  appVersion?: string;
}

let currentConfig: MonitorConfig | null = null;
let globalHandlersInstalled = false;

/**
 * Détermine l'environnement depuis les variables Vite.
 */
function detectEnvironment(): 'production' | 'staging' | 'dev' {
  const env = (import.meta.env.MODE || import.meta.env.VITE_ENV || '').toLowerCase();
  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'staging' || env === 'preview') return 'staging';
  return 'dev';
}

/**
 * Calcule un fingerprint stable pour dédoublonner les erreurs identiques.
 * Format : base64(appId + '::' + message + '::' + component), tronqué à 32 chars.
 * Utilise unicode-safe encoding pour éviter les erreurs btoa sur caractères non-ASCII.
 */
function computeFingerprint(appId: string, message: string, component?: string): string {
  const raw = `${appId}::${message}::${component || ''}`;
  try {
    // btoa ne supporte pas l'unicode direct : on encode d'abord en UTF-8
    const utf8 = typeof TextEncoder !== 'undefined'
      ? Array.from(new TextEncoder().encode(raw)).map(b => String.fromCharCode(b)).join('')
      : unescape(encodeURIComponent(raw));
    return btoa(utf8).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  } catch {
    // Fallback ultra-simple si btoa n'est pas disponible (SSR)
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return `fb${Math.abs(hash).toString(36)}`.slice(0, 32);
  }
}

/**
 * Capture une erreur et l'envoie au backend Atlas Error Monitor.
 * Retourne true si l'envoi a réussi, false sinon — ne throw JAMAIS.
 */
export async function captureError(appId: string, payload: ErrorPayload): Promise<boolean> {
  try {
    if (!appId || !payload?.message) return false;

    const severity: ErrorSeverity = payload.severity || 'error';
    const fingerprint = computeFingerprint(appId, payload.message, payload.component);
    const environment = currentConfig?.environment || detectEnvironment();
    const appVersion = currentConfig?.appVersion || null;

    const url = typeof window !== 'undefined' ? window.location.href : null;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const { error } = await supabase.rpc('upsert_error_log', {
      p_app_id:      appId,
      p_fingerprint: fingerprint,
      p_severity:    severity,
      p_message:     payload.message.slice(0, 2000),
      p_stack_trace: payload.stack ? payload.stack.slice(0, 10000) : null,
      p_component:   payload.component || null,
      p_context:     payload.context || null,
      p_metadata:    (payload.metadata || {}) as Record<string, unknown>,
      p_environment: environment,
      p_app_version: appVersion,
      p_url:         url,
      p_user_agent:  userAgent,
    });

    if (error) {
      // On log en console dev uniquement, on ne propage pas
      if (environment !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[atlas-error-sdk] upsert failed:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    // Silencieux par design : le monitoring ne doit JAMAIS casser l'app
    if (typeof console !== 'undefined' && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[atlas-error-sdk] captureError failed:', err);
    }
    return false;
  }
}

/**
 * Installe les handlers globaux window.onerror + unhandledrejection
 * et stocke la config du monitor pour les appels ultérieurs à captureError.
 */
export function initErrorMonitor(
  appId: string,
  options?: { environment?: 'production' | 'staging' | 'dev'; appVersion?: string }
): void {
  if (!appId) return;

  currentConfig = {
    appId,
    environment: options?.environment || detectEnvironment(),
    appVersion: options?.appVersion,
  };

  if (globalHandlersInstalled || typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    void captureError(appId, {
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      component: event.filename,
      context: 'window.onerror',
      severity: 'error',
      metadata: {
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string' ? reason : 'Unhandled promise rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;

    void captureError(appId, {
      message,
      stack,
      context: 'unhandledrejection',
      severity: 'error',
    });
  });

  globalHandlersInstalled = true;
}

/**
 * Accesseur interne pour les tests / debug.
 */
export function __getConfig(): MonitorConfig | null {
  return currentConfig;
}
