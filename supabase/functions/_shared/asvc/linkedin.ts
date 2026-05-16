// ASVC — LinkedIn helpers (OAuth + UGC post).
//
// LinkedIn n'émet pas de refresh_token en standard (besoin du programme
// partenaires). Donc le token stocké est l'access_token direct, valide 60j.
// À expiration, l'UI doit reproposer une connexion.

import { supabaseAdmin } from "../supabase.ts";

const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY manquante");
  return k;
}

export interface LinkedinCreds {
  token: string;
  account_email: string;
  member_urn: string;          // ex: urn:li:person:abc123
  expires_at: string | null;
}

/** Extrait le member URN encodé dans le champ scope ("xxx|li_urn:urn:li:person:..."). */
function parseMemberUrn(scope: string | null | undefined): string | null {
  if (!scope) return null;
  const idx = scope.indexOf("|li_urn:");
  if (idx === -1) return null;
  return scope.slice(idx + "|li_urn:".length).trim() || null;
}

export async function fetchLinkedinCreds(accountEmail: string): Promise<LinkedinCreds | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "linkedin",
    p_account_email: accountEmail,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token: ${error.message}`);
  if (!data) return null;

  const d = data as {
    refresh_token: string;
    account_email: string;
    expires_at: string | null;
  };

  // Lookup scope pour récupérer le member URN
  const { data: row } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("scope")
    .eq("provider", "linkedin")
    .eq("account_email", accountEmail)
    .maybeSingle();
  const memberUrn = parseMemberUrn((row?.scope as string | null) ?? null);
  if (!memberUrn) {
    throw new Error(`Member URN absent pour ${accountEmail} (reconnexion nécessaire)`);
  }

  return {
    token: d.refresh_token,
    account_email: d.account_email,
    member_urn: memberUrn,
    expires_at: d.expires_at,
  };
}

export async function getDefaultLinkedinAccount(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "linkedin")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}

export async function isLinkedinConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "linkedin")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

export interface PublishPostResult {
  ugc_post_id: string;          // urn:li:ugcPost:...
  post_url: string;
  posted_at: string;
}

/** Publie un UGC Post texte sur le profil du membre connecté. */
export async function publishLinkedinUgcPost(
  creds: LinkedinCreds,
  text: string,
): Promise<PublishPostResult> {
  // Check expiration
  if (creds.expires_at) {
    const exp = new Date(creds.expires_at).getTime();
    if (exp - Date.now() < 60 * 60 * 1000) {
      throw new Error("Token LinkedIn expire dans <1h — reconnexion recommandée");
    }
  }

  const body = {
    author: creds.member_urn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(UGC_POSTS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${creds.token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  const text2 = await res.text();
  let data: { id?: string; message?: string };
  try { data = JSON.parse(text2); } catch { data = { message: text2.slice(0, 200) }; }

  if (!res.ok) {
    throw new Error(`LinkedIn UGC post (${res.status}): ${data.message ?? text2.slice(0, 300)}`);
  }

  const ugcId = data.id ?? "";
  // L'URL publique d'un post LinkedIn n'est pas formellement exposée via l'API.
  // On peut reconstruire une URL si on a l'activity ID (extrait depuis ugcId).
  const activityId = ugcId.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "");
  const postUrl = `https://www.linkedin.com/feed/update/${ugcId}`;

  return {
    ugc_post_id: ugcId,
    post_url: postUrl,
    posted_at: new Date().toISOString(),
  };
}
