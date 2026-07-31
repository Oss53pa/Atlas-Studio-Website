/**
 * Edge Function: admin-grant
 *
 * CDC v2.1 — Lot L7. Orchestrateur d'octroi côté serveur pour CADMIN.
 * Remplace les écritures navigateur des flux « Accès test » + « Offrir ».
 *
 * Enchaîne, pour un client existant :
 *   1) résout/crée le tenant (public.tenants, par billing_email)
 *   2) garantit l'appartenance acheteur-admin (tenant_members) — service role
 *   3) appelle le moteur unique provision_subscription() (transactionnel)
 *   4) si notify: déclenche l'envoi de l'email d'accès (dispatch-access-messages)
 *
 * Admin only. POST body:
 *   { profile_id, nature, motif_attribution, duree_jours, environnement?,
 *     lignes: [{application_code, plan_code, sieges}], notify }
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = await requireAdmin(req);
    if (req.method !== "POST") return errorResponse("Méthode non supportée", 405);

    const body = await req.json();
    const { profile_id, nature, motif_attribution, duree_jours, environnement, lignes, notify } = body;

    if (!profile_id) return errorResponse("profile_id requis", 400);
    if (!Array.isArray(lignes) || lignes.length === 0) return errorResponse("au moins une ligne requise", 400);

    // 1. Profil client
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("id, email, full_name, company_name").eq("id", profile_id).single();
    if (pErr || !profile?.email) return errorResponse("client introuvable ou sans email", 404);

    // 2. Tenant (par billing_email), création si absent
    let tenantId: string;
    const { data: existingTenant } = await supabaseAdmin
      .from("tenants").select("id").ilike("billing_email", profile.email).maybeSingle();
    if (existingTenant?.id) {
      tenantId = existingTenant.id;
    } else {
      const { data: created, error: tErr } = await supabaseAdmin.from("tenants").insert({
        name: profile.company_name || profile.full_name || profile.email,
        billing_email: profile.email, country: "CI", currency: "XOF",
        status: "active", created_by: admin.id,
      }).select("id").single();
      if (tErr || !created) return errorResponse(`tenant: ${tErr?.message || "création échouée"}`, 500);
      tenantId = created.id;
    }

    // 3. Appartenance acheteur-admin (service role — jamais côté navigateur)
    const { error: mErr } = await supabaseAdmin.from("tenant_members").upsert({
      tenant_id: tenantId, user_id: profile.id, role_canonique: "proprietaire",
      statut: "actif", est_acheteur_admin: true, accepte_le: new Date().toISOString(),
      source_migration: "admin-grant",
    }, { onConflict: "tenant_id,user_id" });
    if (mErr) return errorResponse(`membre: ${mErr.message}`, 500);

    // 4. Moteur unique de provisioning
    const payload = {
      idempotency_key: crypto.randomUUID(),
      canal: "admin",
      attribue_par: admin.id,
      tenant: { id: tenantId },
      abonnement: {
        nature: nature || "offert",
        duree_jours: duree_jours ?? 365,
        motif_attribution: motif_attribution || "",
        environnement: environnement || "production",
      },
      lignes,
    };
    const { data: result, error: rErr } = await supabaseAdmin.rpc("provision_subscription", { p_payload: payload });
    if (rErr) return errorResponse(`provision: ${rErr.message}`, 500);
    if (result?.ok === false) return jsonResponse({ ok: false, errors: result.errors }, 422);

    // 5. Notification d'accès (best-effort)
    let notified = false;
    if (notify) {
      try {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/dispatch-access-messages`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({}),
        });
        notified = res.ok;
      } catch (e) { console.warn("[admin-grant] dispatch échoué (non bloquant)", e); }
    }

    return jsonResponse({ ...result, tenant_id: tenantId, notified });
  } catch (error: any) {
    console.error("admin-grant error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur serveur");
  }
});
