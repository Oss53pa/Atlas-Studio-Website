// PROPH3T Tool Direct — execute un tool unique (utilise par MCP server externe
// + apps satellites via le SDK @atlas-studio/proph3t-client).
// Body : { tool_name, args }
// Auth : JWT Supabase user OU SSO JWT (HS256, signe par JWT_SECRET, mint par
//        app-token) OU service_role (avec apikey).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { runTool, type ToolName } from "../_shared/proph3t/tools.ts";
import { getFederationUser, type FederationUser } from "../_shared/federation_auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

interface DirectBody {
  tool_name: string;
  args: Record<string, unknown>;
}

// Rôle effectif de l'appelant : profil pour un user Supabase, "client" par
// défaut pour un end-user satellite (SSO). (Audit 360° — AZ-1/AZ-2)
async function resolveCallerRole(user: FederationUser): Promise<string> {
  if (user.source === "supabase") {
    const { data } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    return data?.role ?? "client";
  }
  return "client";
}

// Autorise (ou non) l'exécution d'un tool selon proph3t_tools.allowed_roles.
// Retourne un message d'erreur si refusé, null si autorisé.
// Fail-open volontaire si le tool n'est pas répertorié (le switch runTool
// contient des tools non encore seedés) — on n'enferme que ce qui est connu.
async function denyToolForRole(toolName: string, user: FederationUser): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("proph3t_tools")
      .select("allowed_roles, enabled_globally")
      .eq("id", toolName)          // .eq() paramétré → pas d'injection de filtre
      .maybeSingle();
    if (error || !data) return null;                  // non répertorié → fail-open
    if (data.enabled_globally === false) return `Tool '${toolName}' désactivé.`;
    const allowed = (data.allowed_roles ?? []) as string[];
    const role = await resolveCallerRole(user);
    if (allowed.length > 0 && !allowed.includes(role)) {
      return `Rôle '${role}' non autorisé pour le tool '${toolName}'.`;
    }
    return null;
  } catch {
    return null;                                      // erreur infra → fail-open
  }
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

    // AuthZ : un appelant non-service_role ne peut exécuter que les tools
    // autorisés à son rôle (proph3t_tools.allowed_roles). (Audit 360° — AZ-1)
    if (!isServiceRole && user) {
      const denied = await denyToolForRole(body.tool_name, user);
      if (denied) return errorResponse(denied, 403);
    }

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
