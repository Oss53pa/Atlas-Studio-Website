import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { licence_id, reason } = await req.json();

    const { data: licence } = await supabaseAdmin.from("licences").select("*, tenants(name, email), products(name)").eq("id", licence_id).single();
    if (!licence) return new Response(JSON.stringify({ error: "Licence introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabaseAdmin.from("licences").update({ status: "suspended", suspended_at: new Date().toISOString(), suspension_reason: reason }).eq("id", licence_id);
    await supabaseAdmin.from("licence_audit_log").insert({ licence_id, tenant_id: licence.tenant_id, actor_type: "pamela", action: "licence_suspended", details: { reason } });

    // Send email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && licence.tenants?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Atlas Studio <notifications@atlasstudio.org>",
          to: [licence.tenants.email],
          subject: `Votre licence ${licence.products?.name || ""} a été suspendue`,
          html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px;"><h2 style="color:#C62828;">Licence suspendue</h2><p>Votre licence a été suspendue pour : <strong>${reason || "Non spécifié"}</strong></p><p>Contactez le support pour réactiver.</p></div>`,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
