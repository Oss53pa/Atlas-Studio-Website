import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const { appId } = await req.json();

    // Accès autorisé si : (1) abonnement actif (propriétaire/acheteur) OU
    // (2) siège actif sur une licence active de cette app (collaborateur invité).
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .eq("app_id", appId)
      .in("status", ["active", "trial"])
      .maybeSingle();

    let plan: string = sub?.plan ?? "";
    let hasAccess = !!sub;

    if (!hasAccess) {
      // Résoudre le produit visé (slug = appId), puis chercher un siège actif.
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("slug", appId)
        .limit(1)
        .maybeSingle();

      if (product) {
        const { data: seat } = await supabaseAdmin
          .from("licence_seats")
          .select("id, licences!inner(status, product_id, plans(name))")
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("licences.product_id", product.id)
          .eq("licences.status", "active")
          .limit(1)
          .maybeSingle();

        if (seat) {
          hasAccess = true;
          // deno-lint-ignore no-explicit-any
          plan = (seat as any).licences?.plans?.name ?? "Collaborateur";
        }
      }
    }

    if (!hasAccess) {
      return errorResponse("Aucun accès actif pour cette application", 403);
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Create JWT using Web Crypto API
    const secret = Deno.env.get("JWT_SECRET")!;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const now = Math.floor(Date.now() / 1000);
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        userId: user.id,
        email: profile?.email,
        fullName: profile?.full_name,
        appId,
        plan,
        iat: now,
        exp: now + 8 * 3600, // 8 hours
      },
      key
    );

    // Map appId to custom subdomain (when subdomain differs from appId)
    const appSubdomains: Record<string, string> = {
      "atlas-fa": "atlas-fna",
      "atlas-compta": "atlas-fna",
      "cockpit-fa": "cockpit-fna",
      "cockpit-journey": "cockpit-journey",
      "taxpilot": "liasspilot",
      "advist": "advist",
      "scrutix": "scrutix",
      "tablesmart": "tablesmart",
      "atlas-crm": "atlas-crm",
    };
    const subdomain = appSubdomains[appId] || appId;
    const redirectUrl = `https://${subdomain}.atlas-studio.org/auth?token=${token}`;

    return jsonResponse({ token, redirectUrl });
  } catch (error: any) {
    console.error("App token error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
