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

    // Verify active subscription
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("app_id", appId)
      .in("status", ["active", "trial"])
      .single();

    if (!sub) {
      return errorResponse("Aucun abonnement actif pour cette application", 403);
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
        plan: sub.plan,
        iat: now,
        exp: now + 8 * 3600, // 8 hours
      },
      key
    );

    const redirectUrl = `https://${appId}.atlasstudio.app/auth?token=${token}`;

    return jsonResponse({ token, redirectUrl });
  } catch (error: any) {
    console.error("App token error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
