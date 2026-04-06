import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─── Tool implementations ───
async function getDashboardKPIs() {
  const [activeSubs, openTickets, pendingInvoices, profiles] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("price_at_subscription").in("status", ["active", "trial"]),
    supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabaseAdmin.from("invoices").select("amount").eq("status", "pending"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const mrr = (activeSubs.data || []).reduce((s: number, r: any) => s + Number(r.price_at_subscription || 0), 0);
  const pendingTotal = (pendingInvoices.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  return {
    mrr_total: mrr,
    arr_total: mrr * 12,
    active_subscriptions: activeSubs.data?.length || 0,
    open_tickets: openTickets.count || 0,
    pending_invoices_amount: pendingTotal,
    total_clients: profiles.count || 0,
  };
}

async function getChurnRiskTenants() {
  const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("*, profiles(full_name, email)")
    .eq("status", "trial")
    .lt("trial_ends_at", threeDays);
  return data || [];
}

async function getOverdueInvoices() {
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("*, profiles(full_name, email)")
    .eq("status", "pending")
    .order("created_at");
  return data || [];
}

// ─── Build context for AI ───
async function buildContext() {
  const kpis = await getDashboardKPIs();
  const churnRisk = await getChurnRiskTenants();
  const overdue = await getOverdueInvoices();

  return `## DONNÉES TEMPS RÉEL (${new Date().toISOString()})
MRR Total : ${kpis.mrr_total.toLocaleString()} FCFA
ARR : ${kpis.arr_total.toLocaleString()} FCFA
Abonnements actifs : ${kpis.active_subscriptions}
Tickets ouverts : ${kpis.open_tickets}
Factures en attente : ${kpis.pending_invoices_amount.toLocaleString()} FCFA
Clients totaux : ${kpis.total_clients}
Essais expirant sous 72h : ${churnRisk.length}
Factures impayées : ${overdue.length}`;
}

// ─── Call AI (Ollama primary, Claude fallback) ───
async function callAI(systemPrompt: string, userMessage: string): Promise<{ response: string; model: string }> {
  // Try Ollama first
  try {
    const ollamaUrl = Deno.env.get("OLLAMA_URL") || "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:70b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
        options: { temperature: 0.3, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      return { response: data.message.content, model: "ollama:llama3.1" };
    }
  } catch { /* Ollama unavailable, fallback */ }

  // Fallback: Claude API
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return { response: "Erreur : ni Ollama ni Claude API ne sont disponibles.", model: "none" };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await res.json();
  return { response: data.content?.[0]?.text || "Erreur de réponse", model: "claude-sonnet" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { conversation_id, message } = await req.json();

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data } = await supabaseAdmin.from("proph3t_conversations").insert({ title: message.slice(0, 100) }).select().single();
      convId = data?.id;
    }

    // Save user message
    if (convId) {
      await supabaseAdmin.from("proph3t_messages").insert({
        conversation_id: convId, role: "user", content: message,
      });
      await supabaseAdmin.from("proph3t_conversations").update({
        message_count: (await supabaseAdmin.from("proph3t_messages").select("id", { count: "exact", head: true }).eq("conversation_id", convId)).count || 0,
        updated_at: new Date().toISOString(),
      }).eq("id", convId);
    }

    // Load memories
    const { data: memories } = await supabaseAdmin
      .from("proph3t_memory")
      .select("subject, content")
      .is("expires_at", null)
      .order("times_referenced", { ascending: false })
      .limit(10);

    // Build context
    const context = await buildContext();
    const memoryStr = (memories || []).map((m: any) => `- ${m.subject}: ${m.content}`).join("\n");

    const systemPrompt = `Tu es Proph3t, l'assistant IA de la Console Atlas Studio.
Tu es connecté en temps réel à toutes les données de la plateforme.

## IDENTITÉ
- Assistant de Pamela Atokouna, SuperAdmin d'Atlas Studio
- Tu connais tous les produits Atlas Studio (Atlas F&A, Liass'Pilot, Advist, etc.)
- Tu réponds en français, de manière concise et actionnable
- Tu ne fabriques JAMAIS de données — uniquement ce qui t'est fourni

${context}

## MÉMOIRE ACTIVE
${memoryStr || "Aucune mémoire active"}

## RÈGLES
1. Cite toujours la source ("d'après les données en temps réel")
2. Propose des actions concrètes quand c'est pertinent
3. Si tu ne sais pas, dis-le clairement
4. Les montants sont toujours en FCFA`;

    // Call AI
    const { response, model } = await callAI(systemPrompt, message);

    // Save assistant message
    if (convId) {
      await supabaseAdmin.from("proph3t_messages").insert({
        conversation_id: convId, role: "assistant", content: response, model_used: model,
      });
    }

    // Log in audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_type: "proph3t",
      action: "proph3t_response",
      resource_type: "proph3t_conversation",
      resource_id: convId,
    }).catch(() => {});

    return new Response(JSON.stringify({
      response,
      conversation_id: convId,
      model_used: model,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
