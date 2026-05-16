// ASVC — Paiements (CinetPay + Stripe via helpers existants du repo).
//
// Génère un payment link pour une asvc_invoice, stocke l'URL + transaction_id,
// retourne l'URL pour inclusion dans l'email Gmail.

import { supabaseAdmin } from "../supabase.ts";
import { initPayment as initCinetpay } from "../cinetpay.ts";
import { stripe } from "../stripe.ts";

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
  provider: "cinetpay" | "stripe";
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

/** Génère une Stripe Checkout Session pour une invoice ASVC.
 *  Devise typique pour international: USD ou EUR. On convertit FCFA → currency
 *  en supposant un taux dans les env (ou par défaut une conversion approximative). */
export async function ensureStripePaymentLink(
  invoiceId: string,
  preferredCurrency: "usd" | "eur" = "usd",
): Promise<PaymentLinkResult> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe non configuré (STRIPE_SECRET_KEY manquant)");
  }

  const { data, error } = await supabaseAdmin
    .from("asvc_invoices")
    .select("id, invoice_number, client_id, client_name, amount_ttc_fcfa, status, payment_url, external_transaction_id, payment_provider")
    .eq("id", invoiceId)
    .single();
  if (error || !data) throw new Error(`Invoice introuvable: ${error?.message ?? invoiceId}`);
  const inv = data as AsvcInvoiceRow & { payment_provider: string | null };

  if (inv.status === "paid") {
    throw new Error("Invoice déjà payée");
  }
  if (inv.payment_url && inv.external_transaction_id && inv.payment_provider === "stripe") {
    return {
      invoice_id: inv.id,
      provider: "stripe",
      payment_url: inv.payment_url,
      external_transaction_id: inv.external_transaction_id,
      amount_fcfa: inv.amount_ttc_fcfa,
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", inv.client_id)
    .maybeSingle();

  // Conversion FCFA → currency:
  // Taux configurables via env. Si non fournis, on utilise des taux indicatifs.
  const fcfaToUsd = parseFloat(Deno.env.get("ASVC_FCFA_TO_USD") ?? "0.00165");  // ~605 FCFA/USD
  const fcfaToEur = parseFloat(Deno.env.get("ASVC_FCFA_TO_EUR") ?? "0.00152");  // ~655 FCFA/EUR
  const rate = preferredCurrency === "eur" ? fcfaToEur : fcfaToUsd;
  const unitAmount = Math.round(inv.amount_ttc_fcfa * rate * 100);              // Stripe = centimes

  const baseReturn = Deno.env.get("ASVC_PAYMENT_RETURN_URL")
    ?? "https://atlas-studio.org/portal/billing";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: preferredCurrency,
        product_data: {
          name: `Atlas Studio — ${inv.invoice_number}`,
          description: `Facture ${inv.invoice_number} — ${inv.client_name}`,
        },
        unit_amount: unitAmount,
      },
      quantity: 1,
    }],
    customer_email: profile?.email ?? undefined,
    success_url: `${baseReturn}?asvc_payment=success&invoice=${inv.invoice_number}`,
    cancel_url: `${baseReturn}?asvc_payment=cancelled&invoice=${inv.invoice_number}`,
    metadata: {
      asvc_invoice_id: inv.id,
      asvc_invoice_number: inv.invoice_number,
      asvc_client_id: inv.client_id,
      asvc_amount_fcfa: String(inv.amount_ttc_fcfa),
      asvc_origin: "facturation_agent",
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session sans URL retournée");
  }

  await supabaseAdmin.rpc("asvc_set_invoice_payment_link", {
    p_invoice_id: inv.id,
    p_provider: "stripe",
    p_payment_url: session.url,
    p_external_transaction_id: session.id,
  });

  return {
    invoice_id: inv.id,
    provider: "stripe",
    payment_url: session.url,
    external_transaction_id: session.id,
    amount_fcfa: inv.amount_ttc_fcfa,
  };
}

/** Sélectionne le provider par défaut selon le pays du client. */
export async function pickDefaultProvider(invoiceId: string): Promise<"cinetpay" | "stripe"> {
  const { data: inv } = await supabaseAdmin
    .from("asvc_invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return "cinetpay";

  // UEMOA + CEMAC countries (FCFA) → CinetPay
  const UEMOA_CEMAC = new Set([
    "CI", "SN", "ML", "BF", "TG", "BJ", "NE", "GW",                  // UEMOA
    "CM", "CG", "GA", "TD", "CF", "GQ",                              // CEMAC
  ]);

  // Atlas Studio profiles.country: optional
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("country")
    .eq("id", inv.client_id)
    .maybeSingle();

  const country = (profile?.country as string | null)?.toUpperCase();
  if (country && !UEMOA_CEMAC.has(country)) return "stripe";
  return "cinetpay";
}
