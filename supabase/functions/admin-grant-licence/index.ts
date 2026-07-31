/**
 * Edge Function: admin-grant-licence
 *
 * CDC v2.1 — Lot L1 (sécurité). Génération de licence CÔTÉ SERVEUR pour le flux
 * d'octroi admin. Remplace la génération de clé côté navigateur (Principe 5 :
 * « rien de sensible n'est produit côté navigateur, ni clé, ni jeton »).
 *
 * La clé d'activation est générée ici, hachée (SHA-256), et SEULE une version
 * MASQUÉE est stockée. La clé en clair ne quitte jamais cette fonction et n'est
 * jamais renvoyée par l'API (cf. Partie 11 : « on régénère et on renvoie, on ne
 * relit pas »). L'email d'accès (lot L6) régénérera une clé au moment de l'envoi.
 *
 * Admin only. POST body:
 *   { tenantId, productId, planId, maxSeats, subscriptionId,
 *     userEmail, userName, durationDays, productSlug, planName }
 * Réponse: { licenceId, keyMasked }
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

function randomKeySegment(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (v) => chars[v % chars.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireAdmin(req);
    if (req.method !== "POST") return errorResponse("Méthode non supportée", 405);

    const {
      tenantId, productId, planId, maxSeats, subscriptionId,
      userEmail, userName, durationDays, productSlug, planName,
    } = await req.json();

    if (!tenantId || !productId || !planId || !subscriptionId || !userEmail) {
      return errorResponse("Paramètres requis manquants (tenantId, productId, planId, subscriptionId, userEmail)", 400);
    }

    const slug = String(productSlug || "APP").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "APP";
    const planCode = String(planName || "PLAN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PLAN";

    // Clé en clair : uniquement en mémoire, le temps de calculer le hash.
    const activationKeyClear = `ATLAS-${slug}-${planCode}-${randomKeySegment(8)}-${randomKeySegment(8)}`;
    const keyHash = await sha256Hex(activationKeyClear);
    // Masque stocké en base : suffixe dérivé du hash (unique) pour respecter UNIQUE(activation_key).
    const keyMasked = `ATLAS-${slug}-${planCode}-****-${keyHash.slice(-6).toUpperCase()}`;

    const now = new Date();
    const days = Number(durationDays) > 0 ? Number(durationDays) : 365;
    const expiresAt = new Date(now.getTime() + days * 86400000);
    const seats = Number(maxSeats) > 0 ? Number(maxSeats) : 999;

    const { data: licence, error: licErr } = await supabaseAdmin.from("licences").insert({
      tenant_id: tenantId,
      product_id: productId,
      plan_id: planId,
      subscription_id: subscriptionId,
      activation_key: keyMasked,
      key_hash: keyHash,
      status: "active",
      max_seats: seats,
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_by: "admin-grant-licence",
    }).select("id").single();
    if (licErr || !licence) return errorResponse(`licence: ${licErr?.message || "insert failed"}`, 500);

    const { error: seatErr } = await supabaseAdmin.from("licence_seats").insert({
      licence_id: licence.id,
      tenant_id: tenantId,
      email: userEmail,
      full_name: userName ?? null,
      role: "app_super_admin",
      status: "active",
      invitation_accepted_at: now.toISOString(),
    });
    if (seatErr) return errorResponse(`seat: ${seatErr.message}`, 500);

    // La clé en clair n'est JAMAIS renvoyée.
    return jsonResponse({ licenceId: licence.id, keyMasked });
  } catch (error: any) {
    console.error("admin-grant-licence error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur serveur");
  }
});
