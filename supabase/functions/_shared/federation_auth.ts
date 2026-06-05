// Federation authentication helper.
//
// Federated satellite apps (Cockpit F&A, TableSmart, AtlasBanx, Liass'Pilot,
// Advist, CockpitJourney) do NOT share Supabase Auth with Atlas Studio core —
// each runs its own Supabase project. The SSO bridge (app-token) instead mints
// an HS256 JWT signed with JWT_SECRET that carries { userId, appId, plan }.
//
// This helper lets central Proph3t endpoints accept BOTH:
//   1. A Supabase user JWT (when called from inside Atlas Studio admin/portal)
//   2. An HS256 JWT signed with JWT_SECRET (when called from a satellite app)
//
// It is intentionally separate from `auth.ts` so the existing admin/portal
// flow keeps its tighter, single-auth-mode contract.

import { decode, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { supabaseAdmin } from "./supabase.ts";
import { AuthError } from "./auth.ts";
import { getVerifyingKey } from "./federation_keys.ts";

export interface FederationUser {
  id: string;
  email?: string;
  /** Set when the caller is a satellite app — drives audit + scoping. */
  appId?: string;
  /** Audience claim (= appId au mint) ; identité d'app non falsifiable. */
  aud?: string;
  /** Subscription plan claimed by the SSO token (if app-token issued it). */
  plan?: string;
  /**
   * Authorised tenant perimeter carried by the signed SSO token
   * (claim `allowed_societies`). Drives Wave A tenant-scope enforcement
   * (Audit 360° — TI-1/2/3) in `runTool`.
   *   - `undefined` → claim absent → no enforcement (backward-compatible).
   *   - `string[]`  → fail-closed: only these society/tenant ids are reachable.
   * Only the SIGNED token can set it — a satellite asserts the perimeter it
   * owns; the LLM/client `society_id` arg is then checked against it.
   */
  allowedSocieties?: string[];
  /** "supabase" when the token is a Supabase user JWT, "sso" when HS256. */
  source: "supabase" | "sso";
}

export interface FederationAuthOptions {
  /**
   * Audience attendue pour un token SSO. Si fournie, un token dont le claim
   * `aud` n'est pas dans cette liste est REJETÉ — c'est ainsi qu'un token minté
   * pour l'app X est refusé sur un endpoint scopé app Y. (Audit 360° — AN-1)
   * Sans effet sur les tokens Supabase (core admin/portail).
   */
  audience?: string | string[];
}

interface SsoPayload {
  userId: string;
  email?: string;
  appId?: string;
  /** Audience standard JWT (= appId au mint). */
  aud?: string;
  plan?: string;
  /** Périmètre tenant autorisé (Wave A — TI-1/2/3). Émis par le satellite. */
  allowed_societies?: unknown;
  exp?: number;
  iat?: number;
}

/** En-tête JWT décodé (non vérifié) — utilisé pour sélectionner la clé per-app. */
interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

/**
 * Vérifie un token SSO HS256 minté par `app-token`.
 *
 * 1. Décode (sans vérifier) l'en-tête/charge utile pour lire `kid`/`aud`/`appId`.
 * 2. Sélectionne la clé de vérification PAR APP (federation_keys) → une app
 *    migrée vers sa propre clé ne peut pas être impersonnée avec une autre clé.
 * 3. Vérifie la signature + `exp` (djwt rejette les tokens expirés).
 * 4. Impose la cohérence `aud === appId` (anti-tampering défensif).
 * 5. Impose l'audience attendue (`opts.audience`) le cas échéant.
 *
 * Sémantique de retour, IMPORTANTE pour les appelants multi-auth (un même
 * endpoint peut recevoir un token SSO, un token Supabase ou une service key) :
 *   - `null` quand le jeton n'est PAS un token SSO valide pour nous
 *     (décodage impossible, mauvaise signature, expiré, clé absente). L'appelant
 *     poursuit ses autres modes d'auth (service_role, etc.).
 *   - THROW `AuthError(403)` quand le token est cryptographiquement VALIDE mais
 *     viole l'audience/la cohérence → refus explicite (token app X pour app Y).
 */
export async function verifySsoToken(
  token: string,
  opts: FederationAuthOptions = {},
): Promise<SsoPayload | null> {
  let payload: SsoPayload;
  try {
    // Peek non vérifié : sert UNIQUEMENT à choisir la clé (la signature est
    // ensuite vérifiée avec cette clé — aucune confiance accordée au peek).
    const [header, rawPayload] = decode(token) as [JwtHeader, SsoPayload, Uint8Array];
    const appHint = header?.kid ?? rawPayload?.aud ?? rawPayload?.appId;

    const key = await getVerifyingKey(appHint);
    if (!key) return null; // aucun secret configuré → pas notre token

    // djwt `Payload` (claims standards + index signature) ne chevauche pas
    // structurellement `SsoPayload` → passage par `unknown` (cast assumé : la
    // forme est garantie par le mint `app-token`, et `userId` est revérifié).
    payload = (await verify(token, key)) as unknown as SsoPayload;
  } catch {
    return null; // décodage / signature / expiration → pas un token SSO valide
  }

  if (!payload.userId) return null;

  // À partir d'ici le token est cryptographiquement valide : toute violation
  // de périmètre est un REFUS explicite (pas une simple non-reconnaissance).

  // Cohérence interne : un token légitime a aud === appId (cf. mint).
  if (payload.aud && payload.appId && payload.aud !== payload.appId) {
    throw new AuthError("Token SSO incohérent (aud ≠ appId)", 403);
  }

  // Enforcement d'audience : le token doit cibler une des apps attendues.
  if (opts.audience !== undefined) {
    const expected = Array.isArray(opts.audience) ? opts.audience : [opts.audience];
    const aud = payload.aud ?? payload.appId;
    if (!aud || !expected.includes(aud)) {
      throw new AuthError(
        `Token SSO refusé : audience '${aud ?? "?"}' hors périmètre`,
        403,
      );
    }
  }

  return payload;
}

/**
 * Authenticate a request that may come from Atlas Studio core OR from a
 * federated satellite app.
 *
 * Order:
 *   1. Try Supabase user JWT (existing admin/portal pattern).
 *   2. Try HS256 JWT verified with JWT_SECRET (SSO token minted by app-token).
 *   3. Reject.
 *
 * Returns `null` when no bearer header is present — let the caller decide
 * between 401 and a public response.
 *
 * `opts.audience` impose qu'un token SSO cible une app attendue (cf.
 * FederationAuthOptions) : un token de l'app X est rejeté hors de son périmètre.
 * Un token SSO présent mais refusé (audience/signature/expiration) fait THROW
 * une AuthError 403/401 — il n'est PAS dégradé silencieusement en `null`.
 */
export async function getFederationUser(
  req: Request,
  opts: FederationAuthOptions = {},
): Promise<FederationUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  // 1. Supabase user JWT
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      return {
        id: data.user.id,
        email: data.user.email ?? undefined,
        source: "supabase",
      };
    }
  } catch {
    /* swallow — try SSO next */
  }

  // 2. HS256 SSO JWT (app-token mint). `verifySsoToken` retourne `null` si ce
  //    n'est pas un token SSO valide (→ on continue), et THROW si le token est
  //    valide mais viole l'audience (→ refus explicite remonté à l'appelant).
  const payload = await verifySsoToken(token, opts);
  if (payload) {
    return {
      id: payload.userId,
      email: payload.email,
      appId: payload.appId,
      aud: payload.aud ?? payload.appId,
      plan: payload.plan,
      allowedSocieties: sanitizeAllowedSocieties(payload.allowed_societies),
      source: "sso",
    };
  }

  return null;
}

/**
 * Normalise le claim `allowed_societies` en `string[]` propre, ou `undefined`
 * si le claim est absent. Un claim présent mais malformé (non-array) est traité
 * comme un périmètre VIDE (`[]`) → fail-closed, jamais ignoré silencieusement.
 */
function sanitizeAllowedSocieties(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined; // claim absent
  if (!Array.isArray(raw)) return []; // présent mais malformé → fail-closed
  return raw
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

/** Same as getFederationUser, but throws 401 when missing. */
export async function requireFederationUser(
  req: Request,
  opts: FederationAuthOptions = {},
): Promise<FederationUser> {
  const u = await getFederationUser(req, opts);
  if (!u) throw new AuthError("Federation token manquant ou invalide");
  return u;
}
