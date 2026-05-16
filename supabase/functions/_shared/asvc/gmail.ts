// ASVC — Gmail connector helpers.
//
// Pipeline:
//   1. ensureValidGmailAccessToken(accountEmail): retourne un access_token
//      valide, en rafraîchissant via refresh_token si expiré.
//   2. sendGmailMessage({to, subject, body, accountEmail}): construit un
//      message MIME RFC 2822 + l'envoie via gmail.users.messages.send

import { supabaseAdmin } from "../supabase.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export interface GmailToken {
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
  account_email: string;
  account_label: string | null;
}

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) {
    throw new Error("APP_ENCRYPTION_KEY manquante ou trop courte");
  }
  return k;
}

function getGoogleCreds(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET manquants (à configurer dans Supabase env)",
    );
  }
  return { clientId, clientSecret };
}

/** Récupère le token stocké en DB (refresh_token déchiffré + access_token caché). */
export async function fetchStoredToken(accountEmail: string): Promise<GmailToken | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "gmail",
    p_account_email: accountEmail,
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token: ${error.message}`);
  if (!data) return null;
  return data as GmailToken;
}

/** Rafraîchit le access_token via refresh_token, met à jour le cache DB. */
async function refreshAccessToken(token: GmailToken): Promise<{ access_token: string; expires_at: string }> {
  const { clientId, clientSecret } = getGoogleCreds();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google refresh token failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  const accessToken = data.access_token as string;
  const expiresInSec = (data.expires_in as number) ?? 3600;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  // Met à jour le cache DB
  await supabaseAdmin.rpc("asvc_oauth_update_access_token", {
    p_provider: "gmail",
    p_account_email: token.account_email,
    p_access_token: accessToken,
    p_expires_at: expiresAt,
  });

  return { access_token: accessToken, expires_at: expiresAt };
}

/** Retourne un access_token valide pour le compte Gmail donné. */
export async function ensureValidAccessToken(accountEmail: string): Promise<string> {
  const token = await fetchStoredToken(accountEmail);
  if (!token) {
    throw new Error(`Aucun token Gmail trouvé pour ${accountEmail}. Connecte le compte d'abord.`);
  }

  // Si access_token caché et pas expiré (avec marge 60s), on le réutilise
  if (token.access_token && token.expires_at) {
    const exp = new Date(token.expires_at).getTime();
    if (exp - Date.now() > 60_000) {
      return token.access_token;
    }
  }

  const { access_token } = await refreshAccessToken(token);
  return access_token;
}

/** Encode une chaîne en base64url (RFC 4648 §5). */
function base64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Encode un en-tête email avec un nom non-ASCII (RFC 2047 base64 UTF-8). */
function encodeHeader(value: string): string {
  // Si tout est ASCII imprimable, pas besoin d'encodage
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

export interface SendGmailParams {
  accountEmail: string;
  to: string;
  subject: string;
  body: string;            // Texte brut. Si tu veux du HTML, passer dans `bodyHtml`
  bodyHtml?: string;
  cc?: string;
  bcc?: string;
  fromName?: string;       // ex: "L'équipe Atlas Studio"
  replyTo?: string;
}

export interface SendGmailResult {
  message_id: string;      // Gmail ID renvoyé par l'API
  thread_id: string;
  sent_at: string;
}

/** Envoie un email via Gmail API depuis `accountEmail`. */
export async function sendGmailMessage(params: SendGmailParams): Promise<SendGmailResult> {
  const accessToken = await ensureValidAccessToken(params.accountEmail);

  const from = params.fromName
    ? `${encodeHeader(params.fromName)} <${params.accountEmail}>`
    : params.accountEmail;

  const headers: string[] = [
    `From: ${from}`,
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : "",
    params.bcc ? `Bcc: ${params.bcc}` : "",
    params.replyTo ? `Reply-To: ${params.replyTo}` : "",
    `Subject: ${encodeHeader(params.subject)}`,
    "MIME-Version: 1.0",
  ].filter((h) => h.length > 0);

  let bodyPart: string;
  if (params.bodyHtml) {
    // Multipart alternative (text + html)
    const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    bodyPart =
      `\r\n--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
      `${params.body}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
      `${params.bodyHtml}\r\n` +
      `--${boundary}--`;
  } else {
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    bodyPart = `\r\n${params.body}`;
  }

  const raw = headers.join("\r\n") + bodyPart;
  const rawEncoded = base64url(raw);

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawEncoded }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Gmail send failed (${res.status}): ${JSON.stringify(data).slice(0, 500)}`,
    );
  }

  await supabaseAdmin.rpc("asvc_oauth_mark_used", {
    p_provider: "gmail",
    p_account_email: params.accountEmail,
  });

  return {
    message_id: data.id as string,
    thread_id: data.threadId as string,
    sent_at: new Date().toISOString(),
  };
}

/** Retourne true si au moins un compte Gmail est connecté et actif. */
export async function isGmailConfigured(): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "gmail")
    .eq("status", "active")
    .limit(1);
  if (error) return false;
  return ((data ?? []).length) > 0;
}

/** Retourne le premier compte Gmail actif (ou null). */
export async function getDefaultGmailAccount(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("account_email")
    .eq("provider", "gmail")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.account_email as string | undefined) ?? null;
}
