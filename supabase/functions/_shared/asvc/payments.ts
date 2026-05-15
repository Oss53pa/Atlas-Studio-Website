// ASVC — Paiements (CinetPay + Stripe via helpers existants du repo).
//
// Génère un payment link pour une asvc_invoice, stocke l'URL + transaction_id,
// retourne l'URL pour inclusion dans l'email Gmail.

import { supabaseAdmin } from "../supabase.ts";
import { initPayment as initCinetpay } from "../cinetpay.ts";

interface AsvcInvoiceRow {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  amount_ttc_fcfa: number;
  status: string;
  payment_url: string | null;
  external_transaction_id: string | null;
}

export interface PaymentLinkResult {
  invoice_id: string;
  provider: "cinetpay";          // 'stripe' à venir
  payment_url: string;
  external_transaction_id: string;
  amount_fcfa: number;
}

export function isCinetpayConfigured(): boolean {
  return !!(Deno.env.get("CINETPAY_API_KEY") && Deno.env.get("CINETPAY_SITE_ID"));
}

export function isStripeConfigured(): boolean {
  return !!Deno.env.get("STRIPE_SECRET_KEY");
}

function getNotifyAndReturnUrls(): { notifyUrl: string; returnUrl: string } {
  const base = Deno.env.get("SUPABASE_URL")!;
  // notify_url: appelé par CinetPay backend (server-to-server)
  const notifyUrl = `${base}/functions/v1/asvc-payment-webhook-cinetpay`;
  // return_url: redirection client après paiement (configurable)
  const returnUrl = Deno.env.get("ASVC_PAYMENT_RETURN_URL")
    ?? "https://atlas-studio.org/portal/billing?asvc_payment=done";
  return { notifyUrl, returnUrl };
}

/** Génère un payment link CinetPay pour une invoice ASVC.
 *  Idempotent: si une URL existe déjà ET que l'invoice n'est pas payée, on la retourne. */
export async function ensureCinetpayPaymentLink(invoiceId: string): Promise<PaymentLinkResult> {
  if (!isCinetpayConfigured()) {
    throw new Error("CinetPay non configuré (CINETPAY_API_KEY / CINETPAY_SITE_ID manquants côté env Edge Functions)");
  }

  const { data, error } = await supabaseAdmin
    .from("asvc_invoices")
    .select("id, invoice_number, client_id, client_name, amount_ttc_fcfa, status, payment_url, external_transaction_id")
    .eq("id", invoiceId)
    .single();
  if (error || !data) throw new Error(`Invoice introuvable: ${error?.message ?? invoiceId}`);
  const inv = data as AsvcInvoiceRow;

  if (inv.status === "paid") {
    throw new Error("Invoice déjà payée");
  }
  if (inv.payment_url && inv.external_transaction_id && inv.status !== "cancelled") {
    return {
      invoice_id: inv.id,
      provider: "cinetpay",
      payment_url: inv.payment_url,
      external_transaction_id: inv.external_transaction_id,
      amount_fcfa: inv.amount_ttc_fcfa,
    };
  }

  // Récupère email client depuis profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", inv.client_id)
    .maybeSingle();

  const { notifyUrl, returnUrl } = getNotifyAndReturnUrls();

  // Transaction ID: préfixe asvc + invoice_number pour traçabilité
  const transactionId = `asvc-${inv.invoice_number}-${Date.now()}`;

  const res = await initCinetpay({
    amount: inv.amount_ttc_fcfa,
    currency: "XOF",                    // FCFA UEMOA. Pour CEMAC = XAF
    transactionId,
    description: `Atlas Studio — ${inv.invoice_number}`,
    notifyUrl,
    returnUrl,
    customerName: profile?.full_name ?? inv.client_name,
    customerEmail: profile?.email ?? undefined,
  });

  if (res.code !== "201" || !res.data?.payment_url) {
    throw new Error(`CinetPay init failed: ${res.message ?? "code=" + res.code}`);
  }

  // Stocke en DB (idempotent via RPC)
  await supabaseAdmin.rpc("asvc_set_invoice_payment_link", {
    p_invoice_id: inv.id,
    p_provider: "cinetpay",
    p_payment_url: res.data.payment_url,
    p_external_transaction_id: transactionId,
  });

  return {
    invoice_id: inv.id,
    provider: "cinetpay",
    payment_url: res.data.payment_url,
    external_transaction_id: transactionId,
    amount_fcfa: inv.amount_ttc_fcfa,
  };
}

/** Récupère le payment URL d'une invoice (s'il existe), sans en créer. */
export async function getInvoicePaymentUrl(invoiceId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("asvc_invoices")
    .select("payment_url")
    .eq("id", invoiceId)
    .maybeSingle();
  return (data?.payment_url as string | null) ?? null;
}
