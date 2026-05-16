// ASVC — Sentry helper.
//
// Récupère un PAT Sentry stocké chiffré et expose des helpers pour interroger
// les stats d'un projet sur une fenêtre donnée. Utilisé par le cron
// post_deploy_monitor pour détecter les spikes d'erreurs post-deploy et
// recommander un rollback à la CEO.

import { supabaseAdmin } from "../supabase.ts";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY manquante");
  return k;
}

function sentryHost(): string {
  return Deno.env.get("ASVC_SENTRY_HOST") ?? "https://sentry.io";
}

export async function fetchSentryPat(orgSlug: string): Promise<{ token: string; org: string } | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "sentry",
    p_account_email: orgSlug,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token: ${error.message}`);
  if (!data) return null;
  const d = data as { refresh_token: string; account_email: string };
  return { token: d.refresh_token, org: d.account_email };
}

export async function getDefaultSentryOrg(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "sentry")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}

export async function isSentryConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "sentry")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

interface SentryFetchOpts {
  method?: "GET" | "POST";
  token: string;
  body?: unknown;
}

async function sf<T = unknown>(path: string, opts: SentryFetchOpts): Promise<T> {
  const res = await fetch(`${sentryHost()}/api/0${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Authorization": `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    const msg = (data as { detail?: string })?.detail ?? `HTTP ${res.status}`;
    throw new Error(`Sentry ${path}: ${msg}`);
  }
  return data as T;
}

/** Retourne le nombre total d'events sur la période + le top issue. */
export interface ProjectErrorStats {
  org: string;
  project: string;
  total_events: number;
  top_issue: { id: string; title: string; count: number; level: string; permalink: string } | null;
  since: string;
  until: string;
}

export async function getProjectErrorStats(
  token: string,
  org: string,
  project: string,
  since: Date,
  until: Date,
): Promise<ProjectErrorStats> {
  const params = new URLSearchParams({
    statsPeriod: "",  // override via 'start' + 'end'
    start: since.toISOString(),
    end: until.toISOString(),
    query: "is:unresolved level:error",
    sort: "freq",
    limit: "1",
  });

  const issues = await sf<Array<{ id: string; title: string; count: string; level: string; permalink: string }>>(
    `/projects/${org}/${project}/issues/?${params.toString()}`,
    { token },
  );

  let totalEvents = 0;
  let topIssue = null;
  for (const issue of issues) {
    const cnt = parseInt(issue.count, 10);
    totalEvents += isNaN(cnt) ? 0 : cnt;
    if (!topIssue) {
      topIssue = {
        id: issue.id,
        title: issue.title,
        count: cnt,
        level: issue.level,
        permalink: issue.permalink,
      };
    }
  }

  return {
    org,
    project,
    total_events: totalEvents,
    top_issue: topIssue,
    since: since.toISOString(),
    until: until.toISOString(),
  };
}

/** Calcule un error_rate approximatif: events/min sur la fenêtre. */
export function computeErrorRate(totalEvents: number, fromIso: string, toIso: string): number {
  const minutes = Math.max(1, (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000);
  return totalEvents / minutes;       // events per minute
}
