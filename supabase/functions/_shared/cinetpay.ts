const CINETPAY_BASE = "https://api-checkout.cinetpay.com/v2";

interface CinetPayInitParams {
  amount: number;
  currency: string;
  transactionId: string;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  customerName?: string;
  customerEmail?: string;
}

interface CinetPayInitResponse {
  code: string;
  message: string;
  data: { payment_url: string; payment_token: string };
}

interface CinetPayVerifyResponse {
  code: string;
  message: string;
  data: {
    amount: string;
    currency: string;
    status: string;
    payment_method: string;
    description: string;
    metadata: string;
    operator_id: string;
    payment_date: string;
  };
}

export async function initPayment(params: CinetPayInitParams): Promise<CinetPayInitResponse> {
  const res = await fetch(`${CINETPAY_BASE}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: Deno.env.get("CINETPAY_API_KEY"),
      site_id: Deno.env.get("CINETPAY_SITE_ID"),
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      customer_name: params.customerName || "",
      customer_email: params.customerEmail || "",
      channels: "ALL",
    }),
  });
  return res.json();
}

export async function verifyPayment(transactionId: string): Promise<CinetPayVerifyResponse> {
  const res = await fetch(`${CINETPAY_BASE}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: Deno.env.get("CINETPAY_API_KEY"),
      site_id: Deno.env.get("CINETPAY_SITE_ID"),
      transaction_id: transactionId,
    }),
  });
  return res.json();
}
