import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * PROPH3T Monitor — Cron job (every 15 minutes)
 * Checks for anomalies and creates alerts automatically.
 *
 * Deploy: supabase functions deploy proph3t-monitor
 * Schedule: Add to pg_cron in Supabase dashboard
 *   SELECT cron.schedule('proph3t-monitor', '*/15 * * * *',
 *     $$ SELECT net.http_post(
 *       'https://YOUR_PROJECT.supabase.co/functions/v1/proph3t-monitor',
 *       '{}', 'application/json',
 *       ARRAY[net.http_header('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')]
 *     ) $$
 *   );
 */

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface MonitorCheck {
  name: string;
  run: () => Promise<{ anomaly: boolean; description?: string; severity?: string; type?: string }>;
}

const checks: MonitorCheck[] = [
  // 1. Trial expiring in 48h
  {
    name: "trial_expiring",
    run: async () => {
      const cutoff = new Date(Date.now() + 48 * 3600000).toISOString();
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("status", "trial")
        .lt("trial_ends_at", cutoff);
      const count = data?.length || 0;
      return count > 0
        ? { anomaly: true, description: `${count} essai(s) expirent dans 48h`, severity: "medium", type: "trial_expiring" }
        : { anomaly: false };
    },
  },
  // 2. Overdue invoices
  {
    name: "overdue_invoices",
    run: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabaseAdmin
        .from("invoices")
        .select("amount")
        .eq("status", "pending")
        .lt("created_at", thirtyDaysAgo);
      const total = (data || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      return (data?.length || 0) > 0
        ? { anomaly: true, description: `${data!.length} facture(s) impayée(s) depuis +30j — ${total.toLocaleString()} FCFA`, severity: "high", type: "payment_overdue" }
        : { anomaly: false };
    },
  },
  // 3. Unanswered tickets > 24h
  {
    name: "sla_breach",
    run: async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data } = await supabaseAdmin
        .from("tickets")
        .select("id")
        .in("status", ["open"])
        .lt("created_at", dayAgo);
      const count = data?.length || 0;
      return count > 0
        ? { anomaly: true, description: `${count} ticket(s) sans réponse depuis +24h`, severity: "high", type: "sla_risk" }
        : { anomaly: false };
    },
  },
  // 4. Failed payments (last hour)
  {
    name: "payment_failures",
    run: async () => {
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count } = await supabaseAdmin
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gt("created_at", hourAgo);
      return (count || 0) > 2
        ? { anomaly: true, description: `${count} paiements échoués dans la dernière heure`, severity: "critical", type: "payment_failure_spike" }
        : { anomaly: false };
    },
  },
  // 5. Cancellation spike
  {
    name: "churn_spike",
    run: async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { count } = await supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gt("cancelled_at", dayAgo);
      return (count || 0) > 3
        ? { anomaly: true, description: `${count} annulations dans les 24 dernières heures`, severity: "high", type: "churn_spike" }
        : { anomaly: false };
    },
  },
];

serve(async (_req: Request) => {
  const results: any[] = [];

  for (const check of checks) {
    try {
      const result = await check.run();

      // Log the check
      await supabaseAdmin.from("proph3t_monitor_log").insert({
        check_type: check.name,
        anomaly_detected: result.anomaly,
        anomaly_description: result.description || null,
      }).catch(() => {});

      if (result.anomaly) {
        // Check if similar alert already exists (not resolved, last 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
        const { data: existing } = await supabaseAdmin
          .from("alerts")
          .select("id")
          .eq("type", result.type)
          .is("resolved_at", null)
          .gt("created_at", twoHoursAgo);

        if (!existing?.length) {
          await supabaseAdmin.from("alerts").insert({
            type: result.type,
            severity: result.severity,
            title: result.description,
          });
        }

        results.push({ check: check.name, anomaly: true, description: result.description });
      } else {
        results.push({ check: check.name, anomaly: false });
      }
    } catch (error) {
      results.push({ check: check.name, error: (error as Error).message });
    }
  }

  return new Response(JSON.stringify({ checked_at: new Date().toISOString(), results }), {
    headers: { "Content-Type": "application/json" },
  });
});
