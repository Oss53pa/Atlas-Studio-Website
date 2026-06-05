// PROPH3T Tool Direct — execute un tool unique (utilise par MCP server externe
// + apps satellites via le SDK @atlas-studio/proph3t-client).
// Body : { tool_name, args }
// Auth : JWT Supabase user OU SSO JWT (HS256, signe par JWT_SECRET, mint par
//        app-token) OU service_role (avec apikey).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { runTool, type ToolName } from "../_shared/proph3t/tools.ts";
import { getFederationUser } from "../_shared/federation_auth.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

interface DirectBody {
  tool_name: string;
  args: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth flexible : Supabase JWT / SSO JWT / service_role
    const user = await getFederationUser(req);
    const auth = req.headers.get("authorization") ?? "";
    // Comparaison EXACTE de la service_role key (pas includes()). (Audit — WF-1)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole = !!serviceKey && auth === `Bearer ${serviceKey}`;

    if (!user && !isServiceRole) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json() as DirectBody;
    if (!body.tool_name) return errorResponse("tool_name requis", 400);

    const t0 = Date.now();
    const result = await runTool(
      body.tool_name as ToolName,
      body.args ?? {},
      { user_id: user?.id },
    );

    // Audit
    await appendAudit({
      action: "proph3t_tool_direct",
      actor_user_id: user?.id,
      content: {
        tool: body.tool_name,
        args_keys: Object.keys(body.args ?? {}),
        duration_ms: Date.now() - t0,
        auth_source: user?.source ?? (isServiceRole ? "service_role" : "unknown"),
        app_id: user?.appId ?? (body.args?.app_id as string | undefined),
      },
    });

    return jsonResponse({
      ok: true,
      tool: body.tool_name,
      duration_ms: Date.now() - t0,
      result,
    });
  } catch (err) {
    return errorResponse((err as Error).message);
  }
});
