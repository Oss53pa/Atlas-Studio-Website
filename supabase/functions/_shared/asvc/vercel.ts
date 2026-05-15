// ASVC — Vercel REST API client (PAT auth).
//
// Stratégie:
// - deploy_to_preview/staging: Vercel auto-déploie depuis git (preview branch).
//   Le connecteur RÉCUPÈRE le statut + URL du déploiement preview courant et
//   met à jour asvc_deployments avec deployment_url + vercel_deployment_id.
// - deploy_to_production: PROMEUT un preview existant en prod (plus sûr que
//   re-build depuis git: garantit que ce qui était validé est bien ce qui passe).

import { supabaseAdmin } from "../supabase.ts";

const API = "https://api.vercel.com";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) {
    throw new Error("APP_ENCRYPTION_KEY manquante");
  }
  return k;
}

export async function fetchVercelPat(
  accountIdentifier: string,
): Promise<{ token: string; teamId: string | null } | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "vercel",
    p_account_email: accountIdentifier,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token: ${error.message}`);
  if (!data) return null;
  const d = data as { refresh_token: string; account_email: string };
  // teamId stocké dans une env var globale (ASVC_VERCEL_TEAM_ID) si applicable
  const teamId = Deno.env.get("ASVC_VERCEL_TEAM_ID") ?? null;
  return { token: d.refresh_token, teamId };
}

export async function getDefaultVercelAccount(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "vercel")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}

export async function isVercelConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "vercel")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

interface VercelFetchOpts {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token: string;
  teamId?: string | null;
}

async function vfetch<T = unknown>(path: string, opts: VercelFetchOpts): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (opts.teamId) url.searchParams.set("teamId", opts.teamId);
  const res = await fetch(url.toString(), {
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
    const msg = (data as { error?: { message?: string } })?.error?.message
      ?? `HTTP ${res.status}`;
    throw new Error(`Vercel ${path}: ${msg}`);
  }
  return data as T;
}

export interface VercelUser {
  id: string;
  email: string;
  username: string;
  name?: string;
}

export async function validateToken(token: string, teamId?: string | null): Promise<VercelUser> {
  const data = await vfetch<{ user: VercelUser }>("/v2/user", { token, teamId });
  return data.user;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  latestDeployments?: Array<{ uid: string; url: string; state: string }>;
}

export async function getProject(token: string, idOrName: string, teamId?: string | null): Promise<VercelProject> {
  return await vfetch<VercelProject>(`/v9/projects/${encodeURIComponent(idOrName)}`, { token, teamId });
}

export interface VercelDeployment {
  uid: string;
  url: string;                // preview URL (foo-xxx.vercel.app)
  state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  readyState?: string;
  target?: "production" | "staging" | null;
  meta?: { githubCommitRef?: string; githubCommitSha?: string };
  createdAt: number;
}

export async function listDeployments(
  token: string,
  projectIdOrName: string,
  teamId?: string | null,
  branch?: string,
  limit = 10,
): Promise<VercelDeployment[]> {
  const params = new URLSearchParams({
    projectId: projectIdOrName,    // accepte aussi le name pour les projets git-linked
    limit: String(limit),
  });
  if (branch) params.set("meta-githubCommitRef", branch);
  const url = `/v6/deployments?${params.toString()}`;
  const data = await vfetch<{ deployments: VercelDeployment[] }>(url, { token, teamId });
  return data.deployments ?? [];
}

export async function getDeployment(
  token: string,
  deploymentId: string,
  teamId?: string | null,
): Promise<VercelDeployment> {
  return await vfetch<VercelDeployment>(`/v13/deployments/${deploymentId}`, { token, teamId });
}

/** Promeut un déploiement existant en production. */
export async function promoteDeployment(
  token: string,
  projectId: string,
  deploymentId: string,
  teamId?: string | null,
): Promise<{ ok: true }> {
  await vfetch(`/v9/projects/${projectId}/promote/${deploymentId}`, {
    method: "POST",
    token,
    teamId,
  });
  return { ok: true };
}

/** Retourne le dernier déploiement READY pour la branche donnée. */
export async function findLatestReadyDeployment(
  token: string,
  projectIdOrName: string,
  branch: string,
  teamId?: string | null,
): Promise<VercelDeployment | null> {
  const all = await listDeployments(token, projectIdOrName, teamId, branch, 20);
  return all.find((d) => d.state === "READY") ?? null;
}
