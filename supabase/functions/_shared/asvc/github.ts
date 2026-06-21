// ASVC — GitHub REST API client (PAT auth).
//
// Pattern: chaque méthode prend un `token` PAT explicite (récupéré depuis
// asvc_oauth_get_token). Helper top-level pour créer PR + Issue.

import { supabaseAdmin } from "../supabase.ts";

const API = "https://api.github.com";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) {
    throw new Error("APP_ENCRYPTION_KEY manquante");
  }
  return k;
}

/** Récupère le PAT déchiffré pour un compte GitHub stocké. */
export async function fetchGithubPat(accountEmail: string): Promise<{ token: string; account: string } | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "github",
    p_account_email: accountEmail,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token: ${error.message}`);
  if (!data) return null;
  const d = data as { refresh_token: string; account_email: string };
  return { token: d.refresh_token, account: d.account_email };
}

/** Retourne le 1er compte GitHub actif (ou null). */
export async function getDefaultGithubAccount(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "github")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}

export async function isGithubConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "github")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

interface GithubFetchOpts {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token: string;
}

async function gh<T = unknown>(path: string, opts: GithubFetchOpts): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Authorization": `Bearer ${opts.token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "asvc-connector",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new Error(`GitHub ${path}: ${msg}`);
  }
  return data as T;
}

// ───────────────────────────────────────────────────────────────────────────
// REST primitives
// ───────────────────────────────────────────────────────────────────────────

interface RepoInfo {
  default_branch: string;
  name: string;
  full_name: string;
}

interface GitRef {
  ref: string;
  object: { sha: string; type: string };
}

interface CreatedRef {
  ref: string;
  object: { sha: string };
}

interface FileCreated {
  content: { sha: string; path: string };
  commit: { sha: string; html_url: string };
}

interface PullRequest {
  number: number;
  html_url: string;
  state: string;
  draft: boolean;
}

interface Issue {
  number: number;
  html_url: string;
  state: string;
}

export async function getRepo(token: string, owner: string, repo: string): Promise<RepoInfo> {
  return await gh<RepoInfo>(`/repos/${owner}/${repo}`, { token });
}

export async function getRef(token: string, owner: string, repo: string, ref: string): Promise<GitRef> {
  return await gh<GitRef>(`/repos/${owner}/${repo}/git/ref/${encodeURIComponent(ref)}`, { token });
}

export async function createRef(token: string, owner: string, repo: string, refName: string, sha: string): Promise<CreatedRef> {
  return await gh<CreatedRef>(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    token,
    body: { ref: `refs/heads/${refName}`, sha },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// GitHub Actions — workflow_dispatch (déploiement des apps buildées par CI
// GitHub plutôt que Vercel, ex: WeDo = APK Android via android.yml).
// ───────────────────────────────────────────────────────────────────────────

/** Parse "owner/repo" ou une URL github.com/owner/repo(.git) → {owner, repo}. */
export function parseRepoSlug(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  const s = input.trim();
  const m = s.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/i);
  if (m) return { owner: m[1], repo: m[2] };
  const parts = s.replace(/\.git$/i, "").split("/").filter(Boolean);
  if (parts.length >= 2) return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
  return null;
}

interface WorkflowRun {
  id: number;
  html_url: string;
  status: string;
  created_at: string;
  event: string;
}

/** Déclenche un workflow GitHub Actions (workflow_dispatch). 204 No Content si OK. */
export async function dispatchWorkflow(
  token: string,
  owner: string,
  repo: string,
  workflowFileOrId: string,
  ref: string,
  inputs?: Record<string, string>,
): Promise<void> {
  await gh(`/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFileOrId)}/dispatches`, {
    method: "POST",
    token,
    body: { ref, inputs: inputs ?? {} },
  });
}

/** Best-effort : run le plus récent d'un workflow (pour un lien UI après dispatch). */
export async function getLatestWorkflowRun(
  token: string,
  owner: string,
  repo: string,
  workflowFileOrId: string,
): Promise<WorkflowRun | null> {
  try {
    const data = await gh<{ workflow_runs?: WorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFileOrId)}/runs?per_page=1`,
      { token },
    );
    return data.workflow_runs?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Encode UTF-8 → base64 (sans dépendre de Buffer). */
function toBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  content: string,
  commitMessage: string,
): Promise<FileCreated> {
  return await gh<FileCreated>(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    token,
    body: {
      message: commitMessage,
      content: toBase64Utf8(content),
      branch,
    },
  });
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  params: { title: string; body: string; head: string; base: string; draft?: boolean },
): Promise<PullRequest> {
  return await gh<PullRequest>(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    token,
    body: {
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      draft: params.draft ?? false,
    },
  });
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  params: { title: string; body: string; labels?: string[] },
): Promise<Issue> {
  return await gh<Issue>(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    token,
    body: {
      title: params.title,
      body: params.body,
      labels: params.labels ?? [],
    },
  });
}

export async function commentOnPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<{ id: number; html_url: string }> {
  return await gh(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    token,
    body: { body },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// High-level: create a "plan PR" (branche + 1 fichier de plan + PR)
// ───────────────────────────────────────────────────────────────────────────

export interface CreatePlanPrParams {
  token: string;
  repo: string;                  // "owner/repo"
  branchName: string;
  baseBranch?: string;           // default: repo.default_branch
  prTitle: string;
  prDescription: string;
  planMarkdown: string;          // contenu du fichier .asvc/plans/<branchSlug>.md
  draft?: boolean;
}

export interface CreatePlanPrResult {
  pr_number: number;
  pr_url: string;
  branch: string;
  base: string;
  commit_sha: string;
  plan_path: string;
}

export async function createPlanPullRequest(params: CreatePlanPrParams): Promise<CreatePlanPrResult> {
  const [owner, name] = params.repo.split("/");
  if (!owner || !name) throw new Error(`repo invalide: ${params.repo} (attendu owner/name)`);

  // 1. Récupère le repo + base branch
  const repoInfo = await getRepo(params.token, owner, name);
  const base = params.baseBranch ?? repoInfo.default_branch;

  // 2. Récupère le SHA de la base
  const baseRef = await getRef(params.token, owner, name, `heads/${base}`);

  // 3. Crée la nouvelle branche depuis le SHA de base (idempotent: si elle
  //    existe déjà, on continue avec celle-ci)
  try {
    await createRef(params.token, owner, name, params.branchName, baseRef.object.sha);
  } catch (e) {
    const msg = (e as Error).message;
    if (!msg.includes("Reference already exists")) {
      throw e;
    }
  }

  // 4. Pousse le fichier de plan
  const planPath = `.asvc/plans/${params.branchName.replace(/\//g, "_")}.md`;
  const commit = await putFile(
    params.token,
    owner,
    name,
    planPath,
    params.branchName,
    params.planMarkdown,
    `chore(asvc): plan for ${params.branchName}\n\nGenerated by ASVC Dev Agent.`,
  );

  // 5. Crée la PR
  const pr = await createPullRequest(params.token, owner, name, {
    title: params.prTitle,
    body: params.prDescription,
    head: params.branchName,
    base,
    draft: params.draft ?? true,
  });

  return {
    pr_number: pr.number,
    pr_url: pr.html_url,
    branch: params.branchName,
    base,
    commit_sha: commit.commit.sha,
    plan_path: planPath,
  };
}
