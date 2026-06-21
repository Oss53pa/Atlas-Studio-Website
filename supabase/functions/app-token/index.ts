import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { getSigningKey } from "../_shared/federation_keys.ts";

/**
 * Wave A (Audit 360° — TI-1/2/3) : périmètre tenant à inscrire dans le token.
 *
 * Le claim `allowed_societies` n'est porté QUE si le core peut légitimement
 * l'affirmer pour ce (user, app). Aujourd'hui le core ne possède PAS les
 * données tenant des satellites (chaque app = son propre Supabase) → on
 * retourne `null` ⇒ claim OMIS ⇒ comportement inchangé (rétrocompatible).
 *
 * Deux façons d'activer l'enforcement :
 *   1. Si le core gère un jour sa propre multi-tenance : résoudre ici les
 *      sociétés de `userId` (table de membership) et retourner la liste.
 *   2. Sinon (cas réel) : le SATELLITE re-mint un token court portant
 *      `allowed_societies` côté serveur avec son `JWT_SECRET` partagé — c'est
 *      le chemin de production documenté dans docs/PROPH3T_TENANT_SCOPE.md.
 *
 * IMPORTANT : ne JAMAIS dériver ce périmètre d'une valeur fournie par le client
 * (auto-déclaration = bypass). Seule une source serveur de confiance compte.
 */
async function resolveAllowedSocieties(
  _userId: string,
  _appId: string,
): Promise<string[] | null> {
  // Pas de source tenant côté core pour l'instant → claim omis (no-op).
  return null;
}

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

    // Create JWT. La clé est résolue PAR APP (federation_keys) : clé propre à
    // l'app si provisionnée (JWT_SECRET_<APPID>), sinon le JWT_SECRET partagé.
    // (Audit 360° — AN-1 : isolation/rotation + audience).
    const key = await getSigningKey(appId);
    if (!key) {
      return errorResponse("Signing key non configurée pour cette app", 500);
    }

    // Wave A : périmètre tenant signé (omis si le core ne peut pas l'affirmer).
    const allowedSocieties = await resolveAllowedSocieties(user.id, appId);

    const now = Math.floor(Date.now() / 1000);
    const token = await create(
      // `kid` = appId : indique au vérificateur quelle clé per-app utiliser.
      { alg: "HS256", typ: "JWT", kid: appId },
      {
        userId: user.id,
        email: profile?.email,
        fullName: profile?.full_name,
        appId,
        // `aud` (audience) = appId : le token n'est valable QUE pour cette app.
        // Un token minté pour l'app X est ainsi refusé pour une action scopée
        // app Y (vérifié dans federation_auth / les endpoints ciblés).
        aud: appId,
        plan,
        // `allowed_societies` (Wave A — TI-1/2/3) : présent UNIQUEMENT quand le
        // core peut affirmer le périmètre → enforcement fail-closed côté
        // runTool. Absent → rétrocompatible (cf. resolveAllowedSocieties).
        ...(allowedSocieties ? { allowed_societies: allowedSocieties } : {}),
        iat: now,
        exp: now + 8 * 3600, // 8 hours
      },
      key
    );

    // Map appId to custom subdomain (when subdomain differs from appId).
    // NB : l'id canonique d'AtlasBanx est `atlasbanx` (catalogue + registry +
    // external_url). `scrutix` est l'ancien codename : on le redirige vers le
    // sous-domaine canonique pour ne pas casser un éventuel token hérité.
    const appSubdomains: Record<string, string> = {
      "atlas-fa": "atlas-fna",
      "atlas-compta": "atlas-fna",
      "cockpit-fa": "cockpit-fna",
      "cockpit-journey": "cockpit-journey",
      "taxpilot": "liasspilot",
      "advist": "advist",
      "atlasbanx": "atlasbanx",
      "scrutix": "atlasbanx",
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
