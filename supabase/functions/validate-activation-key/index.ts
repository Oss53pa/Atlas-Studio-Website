import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { key, tenant_id } = await req.json();
    const keyRegex = /^ATLAS-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{8}-[A-Z0-9]{8}$/;
    if (!keyRegex.test(key)) return new Response(JSON.stringify({ error: "Format de clé invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const keyHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: licence } = await supabaseAdmin.from("licences").select("*, products(name, slug), plans(name, max_seats, price_monthly_fcfa), tenants(name)").eq("key_hash", keyHash).single();

    if (!licence) return new Response(JSON.stringify({ error: "Clé invalide ou déjà utilisée" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (licence.status !== "pending") return new Response(JSON.stringify({ error: `Licence déjà ${licence.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (licence.expires_at && new Date(licence.expires_at) < new Date()) return new Response(JSON.stringify({ error: "Licence expirée" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ valid: true, licence }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
