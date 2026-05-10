// PROPH3T Tool Direct — execute un tool unique (utilise par MCP server externe).
// Body : { tool_name, args }
// Auth : JWT user OU service_role (avec apikey)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { runTool, type ToolName } from "../_shared/proph3t/tools.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

interface DirectBody {
  tool_name: string;
  args: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth flexible : JWT user OU service_role
    const auth = req.headers.get("authorization") ?? "";
    let userId: string | undefined;

    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      try {
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data.user) userId = data.user.id;
      } catch { /* token peut etre service_role */ }
    }

    if (!userId && !auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__never__")) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json() as DirectBody;
    if (!body.tool_name) return errorResponse("tool_name requis", 400);

    const t0 = Date.now();
    const result = await runTool(body.tool_name as ToolName, body.args ?? {}, { user_id: userId });

    // Audit
    await appendAudit({
      action: "proph3t_tool_direct",
      actor_user_id: userId,
      content: { tool: body.tool_name, args_keys: Object.keys(body.args ?? {}), duration_ms: Date.now() - t0 },
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
