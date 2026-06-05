// Per-app HS256 signing keys for the federation SSO bridge. (Audit 360° — AN-1)
//
// Historiquement le JWT SSO était signé avec un unique `JWT_SECRET` partagé par
// TOUTES les apps satellites : une fuite de ce secret permettait d'impersonner
// n'importe quelle app, et un token minté pour l'app X valait pour l'app Y.
//
// Ce module introduit des clés de signature PAR APP, avec rotation possible sans
// casser les apps non migrées :
//   - Si `JWT_SECRET_<APPID>` est provisionné (ex. JWT_SECRET_ATLAS_FA), il est
//     utilisé pour signer/vérifier les tokens de cette app.
//   - Sinon, on retombe sur le `JWT_SECRET` partagé (compat ascendante).
//
// Le mint (app-token) et la vérification (federation_auth) résolvent la clé via
// le MÊME appId, si bien qu'une app migrée vers sa propre clé voit ses tokens
// rejetés partout où l'autre clé est attendue → isolation cryptographique.

const NON_ALNUM = /[^A-Z0-9]+/g;

/** Nom de la variable d'env porteuse du secret propre à une app. */
export function appSecretEnvName(appId: string): string {
  return "JWT_SECRET_" + appId.toUpperCase().replace(NON_ALNUM, "_");
}

interface ResolvedSecret {
  /** Nom de l'env utilisée — sert de clé de cache et indique si per-app. */
  envName: string;
  secret: string;
  /** true si une clé spécifique à l'app a été trouvée (pas le fallback global). */
  perApp: boolean;
}

/**
 * Résout le secret HMAC à utiliser pour une app : clé propre si provisionnée,
 * sinon le `JWT_SECRET` partagé. Retourne `null` si aucun secret n'est configuré.
 */
export function resolveAppSecret(appId?: string | null): ResolvedSecret | null {
  if (appId) {
    const envName = appSecretEnvName(appId);
    const perAppSecret = Deno.env.get(envName);
    if (perAppSecret) return { envName, secret: perAppSecret, perApp: true };
  }
  const shared = Deno.env.get("JWT_SECRET");
  if (shared) return { envName: "JWT_SECRET", secret: shared, perApp: false };
  return null;
}

const keyCache = new Map<string, CryptoKey>();

async function importHmacKey(
  resolved: ResolvedSecret,
  usage: "sign" | "verify",
): Promise<CryptoKey> {
  const cacheKey = `${usage}:${resolved.envName}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(resolved.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
  keyCache.set(cacheKey, key);
  return key;
}

/** Clé de signature (mint) pour une app, ou `null` si aucun secret configuré. */
export async function getSigningKey(appId?: string | null): Promise<CryptoKey | null> {
  const resolved = resolveAppSecret(appId);
  if (!resolved) return null;
  return await importHmacKey(resolved, "sign");
}

/** Clé de vérification pour une app, ou `null` si aucun secret configuré. */
export async function getVerifyingKey(appId?: string | null): Promise<CryptoKey | null> {
  const resolved = resolveAppSecret(appId);
  if (!resolved) return null;
  return await importHmacKey(resolved, "verify");
}
