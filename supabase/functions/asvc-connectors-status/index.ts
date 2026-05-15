// ASVC — Status des connecteurs configurés via env vars (CinetPay, Stripe...).
//
// GET /asvc-connectors-status
// Auth: JWT admin
// Retourne { cinetpay: {configured: bool, site_id?: string}, stripe: {...} }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);
  if (authz.isCron) return errorResponse("Endpoint réservé à l'admin", 403);

  const cinetpayKey = Deno.env.get("CINETPAY_API_KEY");
  const cinetpaySite = Deno.env.get("CINETPAY_SITE_ID");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const googleClient = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const masterKey = Deno.env.get("APP_ENCRYPTION_KEY");

  return jsonResponse({
    cinetpay: {
      configured: !!(cinetpayKey && cinetpaySite),
      site_id_present: !!cinetpaySite,
      api_key_present: !!cinetpayKey,
    },
    stripe: {
      configured: !!stripeKey,
      api_key_present: !!stripeKey,
    },
    gmail_oauth: {
      configured: !!googleClient,
      client_id_present: !!googleClient,
    },
    encryption: {
      configured: !!(masterKey && masterKey.length >= 16),
    },
  });
});
