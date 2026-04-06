import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = await req.json();
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: link } = await supabaseAdmin.from("admin_delegate_links").select("*, licences(*, products(name), tenants(name))").eq("token_hash", tokenHash).eq("status", "active").single();
    if (!link) return new Response(JSON.stringify({ error: "Lien invalide ou expiré" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(link.expires_at) < new Date()) return new Response(JSON.stringify({ error: "Lien expiré" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ valid: true, link }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
