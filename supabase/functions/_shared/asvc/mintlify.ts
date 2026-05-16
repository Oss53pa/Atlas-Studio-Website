// ASVC — Mintlify helper (publication doc via GitHub).
//
// Mintlify déploie sa doc depuis un repo GitHub : on push un fichier .mdx
// dans le repo configuré (ASVC_MINTLIFY_DOCS_REPO) sur une nouvelle branche
// puis on ouvre une PR. À merge, Mintlify auto-rebuild le site.
//
// Pas de clé API Mintlify nécessaire pour ce flow (la connexion GitHub →
// Mintlify est configurée côté Mintlify Dashboard une fois pour toutes).
//
// Env vars requises côté Supabase Edge Functions :
//   ASVC_MINTLIFY_DOCS_REPO       : owner/repo (ex: "atlas-studio/docs")
//   ASVC_MINTLIFY_DOCS_BASE_PATH  : préfixe dossier (ex: "" ou "docs")
//                                   défaut: chaîne vide (à la racine)
//
// Le helper utilise le PAT GitHub déjà configuré dans le connecteur GitHub
// (asvc_oauth_tokens.provider='github'). Aucun double setup.

import { supabaseAdmin } from "../supabase.ts";
import {
  fetchGithubPat,
  getDefaultGithubAccount,
  getRepo,
  getRef,
  createRef,
  putFile,
  createPullRequest,
  isGithubConfigured,
} from "./github.ts";

export interface MintlifyConfig {
  owner: string;
  repo: string;
  basePath: string;
}

export function getMintlifyConfig(): MintlifyConfig | null {
  const repoFull = Deno.env.get("ASVC_MINTLIFY_DOCS_REPO");
  if (!repoFull) return null;
  const parts = repoFull.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`ASVC_MINTLIFY_DOCS_REPO invalide (attendu "owner/repo"): ${repoFull}`);
  }
  const basePath = (Deno.env.get("ASVC_MINTLIFY_DOCS_BASE_PATH") ?? "").replace(/^\/|\/$/g, "");
  return { owner: parts[0], repo: parts[1], basePath };
}

export async function isMintlifyConfigured(): Promise<boolean> {
  if (!getMintlifyConfig()) return false;
  return await isGithubConfigured();
}

// ───────────────────────────────────────────────────────────────────────────
// Génération MDX
// ───────────────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface DocPayload {
  app_name: string;
  doc_type: string;             // ex: "user_guide", "api_reference"
  language: "fr" | "en" | string;
  version: string;
  title: string;
  content_markdown: string;
  screenshots_suggested?: Array<{ placement: string; description: string }>;
}

export interface DocLocation {
  filePath: string;             // ex: "docs/atlas-finance/user-guide-fr.mdx"
  branchName: string;           // ex: "asvc/docs/atlas-finance-user-guide-fr-1700000000"
  commitMessage: string;
}

export function buildDocLocation(cfg: MintlifyConfig, p: DocPayload): DocLocation {
  const appSlug = slugify(p.app_name);
  const docSlug = slugify(p.doc_type);
  const lang = p.language.toLowerCase();
  const ts = Math.floor(Date.now() / 1000);

  // Structure : {base}/{app}/{doc_type}-{lang}.mdx
  const segments = [cfg.basePath, appSlug, `${docSlug}-${lang}.mdx`].filter(Boolean);
  const filePath = segments.join("/");

  return {
    filePath,
    branchName: `asvc/docs/${appSlug}-${docSlug}-${lang}-${ts}`,
    commitMessage: `docs(${appSlug}): ${p.doc_type} ${lang.toUpperCase()} v${p.version}`,
  };
}

/** Wrappe le markdown en MDX avec frontmatter Mintlify. */
export function buildMdxContent(p: DocPayload): string {
  // Échappe les doubles quotes pour les valeurs YAML
  const esc = (s: string) => s.replace(/"/g, '\\"');

  const frontmatter = [
    "---",
    `title: "${esc(p.title)}"`,
    `description: "${esc(p.app_name)} — ${esc(p.doc_type)} (v${esc(p.version)})"`,
    p.doc_type === "api_reference" ? "api: " : null,
    "---",
  ].filter(Boolean).join("\n");

  const screenshotsBlock = p.screenshots_suggested && p.screenshots_suggested.length > 0
    ? `\n\n{/* Captures suggérées (à intégrer manuellement) :\n${p.screenshots_suggested
        .map((s, i) => `  ${i + 1}. [${s.placement}] ${s.description}`)
        .join("\n")}\n*/}\n`
    : "";

  return `${frontmatter}\n\n${p.content_markdown.trim()}${screenshotsBlock}\n`;
}

// ───────────────────────────────────────────────────────────────────────────
// Publication
// ───────────────────────────────────────────────────────────────────────────

export interface PublishResult {
  pr_number: number;
  pr_url: string;
  branch: string;
  file_path: string;
  repo: string;
}

/**
 * Crée une nouvelle branche, push le fichier MDX, ouvre une PR.
 * Mintlify auto-déploie au merge (pas besoin d'appeler son API).
 *
 * Si le fichier existe déjà : le PUT GitHub crée un nouveau commit avec sha
 * fourni (TODO: pour MVP, on crée toujours sur nouvelle branche → pas de
 * conflit même si le fichier existe sur main, GitHub gérera le merge).
 */
export async function publishDocToMintlifyRepo(p: DocPayload): Promise<PublishResult> {
  const cfg = getMintlifyConfig();
  if (!cfg) {
    throw new Error("Mintlify non configuré (ASVC_MINTLIFY_DOCS_REPO manquant)");
  }

  const account = await getDefaultGithubAccount();
  if (!account) {
    throw new Error("Aucun compte GitHub connecté (requis pour pousser vers le repo docs)");
  }
  const creds = await fetchGithubPat(account);
  if (!creds) throw new Error(`PAT GitHub introuvable pour ${account}`);

  const { owner, repo } = cfg;
  const loc = buildDocLocation(cfg, p);
  const mdx = buildMdxContent(p);

  // 1. Récupère le SHA du default branch
  const repoInfo = await getRepo(creds.token, owner, repo);
  const defaultBranch = repoInfo.default_branch;
  const baseRef = await getRef(creds.token, owner, repo, `heads/${defaultBranch}`);

  // 2. Crée la nouvelle branche depuis le default
  await createRef(creds.token, owner, repo, loc.branchName, baseRef.object.sha);

  // 3. Push le fichier MDX sur cette branche
  await putFile(
    creds.token,
    owner,
    repo,
    loc.filePath,
    loc.branchName,
    mdx,
    loc.commitMessage,
  );

  // 4. Ouvre une PR
  const prBody = [
    `📚 Doc générée par ASVC Documentation Agent.`,
    ``,
    `- **App** : ${p.app_name}`,
    `- **Type** : ${p.doc_type}`,
    `- **Langue** : ${p.language.toUpperCase()}`,
    `- **Version** : v${p.version}`,
    ``,
    `**⚠️ N'oublie pas d'ajouter \`${loc.filePath}\` dans \`mint.json\` / \`docs.json\` pour le faire apparaître dans la navigation.**`,
    ``,
    p.screenshots_suggested && p.screenshots_suggested.length > 0
      ? `**Captures suggérées** (à intégrer manuellement) :\n${p.screenshots_suggested.map((s, i) => `${i + 1}. [${s.placement}] ${s.description}`).join("\n")}`
      : "",
    ``,
    `_Generated by ASVC. Merge déclenchera l'auto-build Mintlify._`,
  ].filter((line) => line !== null).join("\n");

  const pr = await createPullRequest(creds.token, owner, repo, {
    title: `📚 ${p.title} (${p.language.toUpperCase()})`,
    body: prBody,
    head: loc.branchName,
    base: defaultBranch,
    draft: false,
  });

  await supabaseAdmin.rpc("asvc_oauth_mark_used", {
    p_provider: "github",
    p_account_email: account,
  });

  return {
    pr_number: pr.number,
    pr_url: pr.html_url,
    branch: loc.branchName,
    file_path: loc.filePath,
    repo: `${owner}/${repo}`,
  };
}
