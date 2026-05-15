// ASVC — WhatsApp Business Cloud API (Meta).
//
// Setup env requis:
//   - WHATSAPP_TOKEN              : System User Token (long-lived, business manager)
//   - WHATSAPP_PHONE_NUMBER_ID    : ID du numéro registered chez Meta
//   - WHATSAPP_WEBHOOK_VERIFY_TOKEN : token verbose pour la handshake GET du webhook
//   - WHATSAPP_APP_SECRET         : pour vérifier X-Hub-Signature-256 sur les POST entrants
//
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
//
// Note 24h-window: un message texte libre n'est autorisé QUE dans les 24h
// suivant le dernier message client. Hors fenêtre, il faut un message
// "template" (pre-approved). Pour l'instant on envoie en texte brut — si le
// destinataire n'a pas écrit depuis 24h, Meta retournera une erreur claire
// qu'on remontera à la CEO.

const GRAPH_API_VERSION = "v21.0";

export function isWhatsappConfigured(): boolean {
  return !!(
    Deno.env.get("WHATSAPP_TOKEN") &&
    Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
  );
}

export function isWhatsappWebhookConfigured(): boolean {
  return !!(
    Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") &&
    Deno.env.get("WHATSAPP_APP_SECRET")
  );
}

interface SendTextParams {
  to: string;                   // ex: "+221770000000" (E.164)
  body: string;
}

export interface SendWhatsappResult {
  message_id: string;
  to: string;
  sent_at: string;
}

/** Normalise un numéro de téléphone au format E.164 (sans le +). */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export async function sendWhatsappText(params: SendTextParams): Promise<SendWhatsappResult> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp non configuré (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID manquants)");
  }

  const to = normalizePhone(params.to);
  if (to.length < 8) {
    throw new Error(`Numéro destinataire invalide: ${params.to}`);
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: true,           // affiche un aperçu pour les URL de paiement
        body: params.body,
      },
    }),
  });

  const text = await res.text();
  let data: { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`WhatsApp send: réponse non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const errMsg = data.error?.message ?? `HTTP ${res.status}`;
    const code = data.error?.code ?? "?";
    throw new Error(`WhatsApp send échec (code=${code}): ${errMsg}`);
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new Error(`WhatsApp send: pas de message_id dans la réponse (${text.slice(0, 200)})`);
  }

  return {
    message_id: messageId,
    to: `+${to}`,
    sent_at: new Date().toISOString(),
  };
}

/** Vérifie la signature X-Hub-Signature-256 envoyée par Meta sur le webhook. */
export async function verifyMetaSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) return false;

  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  // HMAC SHA-256
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparaison constant-time
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
