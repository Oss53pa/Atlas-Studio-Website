// Atlas Studio DataBus — échange de données entre apps de la suite.
//
// Met fin au cycle « export Excel → réimport » ENTRE les apps : un producteur
// publie un objet typé auto-suffisant, un consommateur le récupère et l'accuse.
//
// Auth : JWT SSO de fédération (getFederationUser).
//   - Appel depuis une app satellite (source 'sso') : producer/consumer = appId
//     du token (anti-spoofing), owner = compte Atlas Studio du token.
//   - Appel depuis le portail/admin (source 'supabase') : producer/consumer
//     explicites dans le body, owner = utilisateur courant.
//
// Actions (POST { action, ... }) :
//   publish — { object_type, payload, consumer_app?, company_id?,
//               idempotency_key?, schema_version?, producer_app? }
//   pull    — { object_type?, limit?, consumer_app? }
//   ack     — { ids:[], status?='consumed', error?, consumer_app? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireFederationUser } from "../_shared/federation_auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireFederationUser(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    // L'identité de l'app vient du token SSO (non falsifiable). Le portail/admin
    // (source 'supabase') peut agir au nom d'une app via le body.
    const tokenApp = user.appId;

    if (action === "publish") {
      const producer_app = tokenApp ?? body.producer_app;
      if (!producer_app) return errorResponse("producer_app requis", 400);
      if (!body.object_type) return errorResponse("object_type requis", 400);
      if (body.payload === undefined || body.payload === null) {
        return errorResponse("payload requis", 400);
      }

      const row = {
        owner_id: user.id,
        company_id: body.company_id ?? null,
        producer_app,
        consumer_app: body.consumer_app ?? null,
        object_type: body.object_type,
        schema_version: body.schema_version ?? 1,
        payload: body.payload,
        idempotency_key: body.idempotency_key ?? null,
      };

      const { data, error } = await supabaseAdmin
        .from("databus_objects")
        .insert(row)
        .select("id, status, created_at")
        .single();

      if (error) {
        // Conflit d'idempotence → renvoie l'objet déjà publié (publish idempotent).
        if (error.code === "23505" && body.idempotency_key) {
          const { data: existing } = await supabaseAdmin
            .from("databus_objects")
            .select("id, status, created_at")
            .eq("producer_app", producer_app)
            .eq("idempotency_key", body.idempotency_key)
            .single();
          return jsonResponse({ duplicate: true, object: existing });
        }
        return errorResponse(error.message, 400);
      }
      return jsonResponse({ object: data });
    }

    if (action === "pull") {
      const consumer_app = tokenApp ?? body.consumer_app;
      if (!consumer_app) return errorResponse("consumer_app requis", 400);

      // Une app satellite ne pull que les objets de SON compte Atlas Studio.
      const ownerScope = user.source === "sso" ? user.id : (body.owner_id ?? null);

      const { data, error } = await supabaseAdmin.rpc("databus_claim", {
        p_consumer_app: consumer_app,
        p_owner_id: ownerScope,
        p_object_type: body.object_type ?? null,
        p_limit: Math.min(Number(body.limit) || 50, 200),
      });
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ objects: data ?? [] });
    }

    if (action === "ack") {
      const consumer_app = tokenApp ?? body.consumer_app;
      if (!consumer_app) return errorResponse("consumer_app requis", 400);
      if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return errorResponse("ids requis", 400);
      }
      const { data, error } = await supabaseAdmin.rpc("databus_ack", {
        p_ids: body.ids,
        p_consumer: consumer_app,
        p_status: body.status ?? "consumed",
        p_error: body.error ?? null,
      });
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ acked: data });
    }

    return errorResponse("action inconnue (publish | pull | ack)", 400);
  } catch (error: any) {
    console.error("databus error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
