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

import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { supabaseAdmin } from "./supabase.ts";
import { AuthError } from "./auth.ts";

export interface FederationUser {
  id: string;
  email?: string;
  /** Set when the caller is a satellite app — drives audit + scoping. */
  appId?: string;
  /** Subscription plan claimed by the SSO token (if app-token issued it). */
  plan?: string;
  /** "supabase" when the token is a Supabase user JWT, "sso" when HS256. */
  source: "supabase" | "sso";
}

let cachedKey: CryptoKey | null = null;
async function getJwtSecretKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) return null;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return cachedKey;
}

interface SsoPayload {
  userId: string;
  email?: string;
  appId?: string;
  plan?: string;
  exp?: number;
  iat?: number;
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
 */
export async function getFederationUser(
  req: Request,
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

  // 2. HS256 SSO JWT (app-token mint)
  const key = await getJwtSecretKey();
  if (key) {
    try {
      const payload = (await verify(token, key)) as SsoPayload;
      if (payload.userId) {
        return {
          id: payload.userId,
          email: payload.email,
          appId: payload.appId,
          plan: payload.plan,
          source: "sso",
        };
      }
    } catch {
      /* not a valid SSO token either */
    }
  }

  return null;
}

/** Same as getFederationUser, but throws 401 when missing. */
export async function requireFederationUser(
  req: Request,
): Promise<FederationUser> {
  const u = await getFederationUser(req);
  if (!u) throw new AuthError("Federation token manquant ou invalide");
  return u;
}
