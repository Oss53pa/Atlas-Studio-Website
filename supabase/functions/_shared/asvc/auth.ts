// ASVC — Helper d'authentification commun aux edge functions.
//
// Deux modes acceptés:
//   1. JWT admin (Authorization: Bearer <jwt>) → déclenchement UI
//      Vérifié via supabase.auth.getUser() + RPC is_admin
//   2. Shared secret cron (Authorization: Bearer <CRON_SHARED_SECRET>)
//      → pg_cron / GitHub Actions / appel inter-functions
//
// Usage:
//   const authz = await authorizeRequest(req);
//   if (!authz.ok) return errorResponse(authz.reason, 401);
//   // authz.actor = user_id ou 'cron'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AuthzResult =
  | { ok: true; actor: string; isCron: boolean }
  | { ok: false; reason: string };

export async function authorizeRequest(req: Request): Promise<AuthzResult> {
  const auth = req.headers.get("authorization") ?? "";

  const sharedSecret = Deno.env.get("CRON_SHARED_SECRET");
  if (sharedSecret && auth === `Bearer ${sharedSecret}`) {
    return { ok: true, actor: "cron", isCron: true };
  }

  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return { ok: false, reason: "Authorization header manquant" };
  const jwt = m[1];

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return { ok: false, reason: "JWT invalide" };

  const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
  if (adminErr) return { ok: false, reason: `is_admin: ${adminErr.message}` };
  if (!isAdmin) return { ok: false, reason: "Admin only" };

  return { ok: true, actor: userData.user.id, isCron: false };
}
