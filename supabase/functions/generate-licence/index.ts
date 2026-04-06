import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { tenant_id, product_id, plan_id, subscription_id } = await req.json();

    // Get product + plan
    const [{ data: product }, { data: plan }, { data: tenant }] = await Promise.all([
      supabaseAdmin.from("products").select("name, slug").eq("id", product_id).single(),
      supabaseAdmin.from("plans").select("name, max_seats, price_monthly_fcfa").eq("id", plan_id).single(),
      supabaseAdmin.from("tenants").select("name, email").eq("id", tenant_id).single(),
    ]);

    if (!product || !plan || !tenant) return new Response(JSON.stringify({ error: "Missing data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Generate activation key
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const randomPart = (len: number) => Array.from(crypto.getRandomValues(new Uint8Array(len)), v => chars[v % chars.length]).join("");
    const slug = product.slug.toUpperCase().slice(0, 8);
    const planName = plan.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const activationKey = `ATLAS-${slug}-${planName}-${randomPart(8)}-${randomPart(8)}`;

    // Hash key
    const keyHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(activationKey));
    const keyHash = Array.from(new Uint8Array(keyHashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Generate offline token
    const hmacSecret = Deno.env.get("LICENCE_HMAC_SECRET") || Deno.env.get("JWT_SECRET") || "atlas-default-secret";
    const offlinePayload = { tenantId: tenant_id, productId: product_id, planId: plan_id, keyHash, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
    const hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(hmacSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(JSON.stringify(offlinePayload)));
    const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const offlineToken = btoa(JSON.stringify({ payload: offlinePayload, sig: sigHex })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    // Insert licence
    const { data: licence, error: licErr } = await supabaseAdmin.from("licences").insert({
      tenant_id, product_id, plan_id, subscription_id,
      activation_key: activationKey, key_hash: keyHash,
      status: "pending", max_seats: plan.max_seats || 1,
      offline_token: offlineToken,
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    }).select().single();

    if (licErr) return new Response(JSON.stringify({ error: licErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create super admin seat
    await supabaseAdmin.from("licence_seats").insert({
      licence_id: licence.id, tenant_id, email: tenant.email,
      role: "app_super_admin", status: "active",
      invitation_accepted_at: new Date().toISOString(),
    });

    // Send activation email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Pamela — Atlas Studio <notifications@atlasstudio.org>",
          to: [tenant.email],
          subject: `Votre licence ${product.name} est prête — activez maintenant`,
          html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;padding:32px;">
            <h2 style="color:#EF9F27;">Votre licence est prête</h2>
            <p>Bonjour,</p>
            <p>Votre achat de <strong>${product.name}</strong> (${plan.name}) a été confirmé.</p>
            <div style="background:#0A0A0A;color:#EF9F27;padding:16px 24px;border-radius:8px;font-family:monospace;font-size:16px;text-align:center;margin:20px 0;letter-spacing:1px;">${activationKey}</div>
            <p><a href="https://atlas-studio.org/portal?activate=${encodeURIComponent(activationKey)}" style="display:inline-block;padding:12px 32px;background:#EF9F27;color:#000;border-radius:8px;font-weight:500;text-decoration:none;">Activer ma licence →</a></p>
            <p style="font-size:13px;color:#888;">Plan: ${plan.name} · Sièges: ${plan.max_seats || 1} · Expire: ${new Date(Date.now() + 365 * 86400000).toLocaleDateString("fr-FR")}</p>
          </div>`,
        }),
      });
    }

    // Audit log
    await supabaseAdmin.from("licence_audit_log").insert({
      licence_id: licence.id, tenant_id, actor_type: "system", action: "licence_generated",
      details: { product: product.name, plan: plan.name, seats: plan.max_seats },
    });

    // Mask key in DB
    await supabaseAdmin.from("licences").update({ activation_key: `ATLAS-${slug}-${planName}-****-****` }).eq("id", licence.id);

    return new Response(JSON.stringify({ success: true, licence_id: licence.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
