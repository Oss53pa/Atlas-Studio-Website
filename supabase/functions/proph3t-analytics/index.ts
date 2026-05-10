// PROPH3T Analytics — stats d'utilisation des tools
// Reserve aux admins. Body : { period_days?: number }
// Retourne : top tools, latence moyenne, modeles utilises, errors, evolution.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface AnalyticsBody {
  period_days?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return errorResponse("Acces reserve aux admins", 403);
    }

    const body = await req.json().catch(() => ({})) as AnalyticsBody;
    const periodDays = body.period_days ?? 30;
    const since = new Date(Date.now() - periodDays * 86400 * 1000).toISOString();

    // 1. Total messages assistant + latence moyenne par jour
    const { data: messagesAgg } = await supabaseAdmin
      .from("proph3t_messages")
      .select("created_at, latency_ms, confidence_score, model_used, citations")
      .eq("role", "assistant")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    const messages = messagesAgg ?? [];

    // 2. Models used (count + avg latency)
    const byModel: Record<string, { count: number; total_latency: number; avg_confidence: number; total_confidence: number }> = {};
    for (const m of messages) {
      const k = m.model_used ?? "unknown";
      byModel[k] ??= { count: 0, total_latency: 0, avg_confidence: 0, total_confidence: 0 };
      byModel[k].count++;
      byModel[k].total_latency += m.latency_ms ?? 0;
      if (m.confidence_score !== null && m.confidence_score !== undefined) {
        byModel[k].total_confidence += m.confidence_score;
      }
    }
    const models = Object.entries(byModel).map(([model, v]) => ({
      model,
      count: v.count,
      avg_latency_ms: v.count > 0 ? Math.round(v.total_latency / v.count) : 0,
      avg_confidence: v.count > 0 ? Math.round(v.total_confidence / v.count) : 0,
    })).sort((a, b) => b.count - a.count);

    // 3. Volume par jour (24 derniers jours max)
    const byDay: Record<string, number> = {};
    for (const m of messages) {
      const d = new Date(m.created_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }
    const dailyVolume = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Tools usage : on extrait des citations
    const byTool: Record<string, number> = {};
    for (const m of messages) {
      const cits = (m.citations as any[]) ?? [];
      for (const c of cits) {
        if (c?.tool) byTool[c.tool] = (byTool[c.tool] ?? 0) + 1;
      }
    }
    const topTools = Object.entries(byTool)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // 5. Audit log : actions
    const { data: auditAgg } = await supabaseAdmin
      .from("proph3t_audit_log")
      .select("action, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    const byAction: Record<string, number> = {};
    for (const a of auditAgg ?? []) {
      byAction[a.action] = (byAction[a.action] ?? 0) + 1;
    }
    const topActions = Object.entries(byAction)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // 6. Tools registry stats
    const { data: tools } = await supabaseAdmin
      .from("proph3t_tools")
      .select("level, domain")
      .order("level");
    const registryStats = {
      total: tools?.length ?? 0,
      by_level: { l1: 0, l2: 0 },
      by_domain: {} as Record<string, number>,
    };
    for (const t of tools ?? []) {
      if (t.level === 1) registryStats.by_level.l1++;
      else if (t.level === 2) registryStats.by_level.l2++;
      if (t.domain) registryStats.by_domain[t.domain] = (registryStats.by_domain[t.domain] ?? 0) + 1;
    }

    return jsonResponse({
      ok: true,
      period_days: periodDays,
      since,
      summary: {
        total_messages: messages.length,
        avg_latency_ms: messages.length > 0 ? Math.round(messages.reduce((s, m) => s + (m.latency_ms ?? 0), 0) / messages.length) : 0,
        avg_confidence: messages.length > 0 ? Math.round(messages.filter(m => m.confidence_score !== null).reduce((s, m) => s + (m.confidence_score ?? 0), 0) / Math.max(1, messages.filter(m => m.confidence_score !== null).length)) : 0,
      },
      models,
      daily_volume: dailyVolume,
      top_tools: topTools,
      top_actions: topActions,
      registry: registryStats,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return errorResponse(e.message, e.status ?? 500);
  }
});
