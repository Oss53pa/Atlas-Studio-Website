// ASVC — Meta helpers (Facebook Pages + Instagram Business).
//
// Stockage : 1 entry asvc_oauth_tokens par Page (account_email = page_id).
// Le scope encode : page_name + ig_user_id (si lié).
//
// Page Access Token = never-expiring (grâce au scope business_management
// demandé pendant l'OAuth). Pas besoin de refresh logic.

import { supabaseAdmin } from "../supabase.ts";

const GRAPH = "https://graph.facebook.com/v21.0";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY manquante");
  return k;
}

export interface MetaCreds {
  page_id: string;
  page_name: string;
  page_access_token: string;
  ig_user_id: string | null;
}

function parseMetaScope(scope: string | null | undefined): {
  page_name: string | null;
  ig_user_id: string | null;
} {
  if (!scope) return { page_name: null, ig_user_id: null };
  const parts = scope.split("|");
  let page_name: string | null = null;
  let ig_user_id: string | null = null;
  for (const p of parts) {
    if (p.startsWith("meta_page_name:")) {
      try { page_name = decodeURIComponent(p.slice("meta_page_name:".length)); } catch { /* ignore */ }
    } else if (p.startsWith("meta_ig_user_id:")) {
      ig_user_id = p.slice("meta_ig_user_id:".length) || null;
    }
  }
  return { page_name, ig_user_id };
}

export async function isMetaConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "meta")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

/** Récupère le first Meta account configuré (par défaut le plus ancien). */
export async function getDefaultMetaPageId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "meta")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}

/** Récupère les creds d'une Page (par page_id). */
export async function fetchMetaCreds(pageId: string): Promise<MetaCreds | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "meta",
    p_account_email: pageId,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token (meta): ${error.message}`);
  if (!data) return null;

  const d = data as { refresh_token: string };

  // Lookup scope pour récupérer page_name + ig_user_id
  const { data: row } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("scope, account_label")
    .eq("provider", "meta")
    .eq("account_email", pageId)
    .maybeSingle();
  const parsed = parseMetaScope((row?.scope as string | null) ?? null);

  return {
    page_id: pageId,
    page_name: parsed.page_name ?? (row?.account_label as string | undefined) ?? pageId,
    page_access_token: d.refresh_token,
    ig_user_id: parsed.ig_user_id,
  };
}

export interface FbPostResult {
  post_id: string;          // ex: "{page_id}_{post_id}"
  post_url: string;
  posted_at: string;
}

/** Publie un post texte (avec lien optionnel) sur la Page Facebook. */
export async function publishFacebookPost(
  creds: MetaCreds,
  message: string,
  linkUrl?: string,
): Promise<FbPostResult> {
  const url = `${GRAPH}/${creds.page_id}/feed`;
  const params = new URLSearchParams({
    message,
    access_token: creds.page_access_token,
  });
  if (linkUrl) params.set("link", linkUrl);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data?.id) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Facebook /feed: ${msg}`);
  }
  const postId = data.id as string;        // format "{page_id}_{numeric}"
  const numericPostId = postId.includes("_") ? postId.split("_")[1] : postId;
  return {
    post_id: postId,
    post_url: `https://www.facebook.com/${creds.page_id}/posts/${numericPostId}`,
    posted_at: new Date().toISOString(),
  };
}

export interface IgPostResult {
  media_id: string;          // ID de la publication finale
  container_id: string;      // ID du container intermédiaire
  post_url: string;          // permalink IG (récupéré post-publish)
  posted_at: string;
}

/**
 * Publie une image sur Instagram (2-step container/publish).
 *
 * IG ne supporte PAS le text-only. Une image hébergée publiquement est requise.
 * Si imageUrl est null/undefined, lève une erreur claire pour le caller (Content
 * Agent doit alors retomber sur LinkedIn ou Facebook).
 */
export async function publishInstagramPost(
  creds: MetaCreds,
  imageUrl: string,
  caption: string,
): Promise<IgPostResult> {
  if (!creds.ig_user_id) {
    throw new Error("Pas d'Instagram Business Account lié à cette Page Facebook");
  }
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    throw new Error("Instagram requiert une image_url publique (https)");
  }

  // 1. Crée le container
  const cParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: creds.page_access_token,
  });
  const cRes = await fetch(`${GRAPH}/${creds.ig_user_id}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: cParams.toString(),
  });
  const cData = await cRes.json();
  if (!cRes.ok || !cData?.id) {
    throw new Error(`Instagram /media: ${cData?.error?.message ?? `HTTP ${cRes.status}`}`);
  }
  const containerId = cData.id as string;

  // 2. Publish le container
  const pParams = new URLSearchParams({
    creation_id: containerId,
    access_token: creds.page_access_token,
  });
  const pRes = await fetch(`${GRAPH}/${creds.ig_user_id}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pParams.toString(),
  });
  const pData = await pRes.json();
  if (!pRes.ok || !pData?.id) {
    throw new Error(`Instagram /media_publish: ${pData?.error?.message ?? `HTTP ${pRes.status}`}`);
  }
  const mediaId = pData.id as string;

  // 3. Récupère le permalink (best-effort, ne pas faire échouer si échec)
  let postUrl = `https://www.instagram.com/p/${mediaId}/`;
  try {
    const linkRes = await fetch(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(creds.page_access_token)}`,
    );
    const linkData = await linkRes.json();
    if (linkRes.ok && linkData?.permalink) postUrl = linkData.permalink as string;
  } catch { /* ignore */ }

  return {
    media_id: mediaId,
    container_id: containerId,
    post_url: postUrl,
    posted_at: new Date().toISOString(),
  };
}
