/**
 * Email sending via Resend API (works in Deno/Edge Functions).
 * Set RESEND_API_KEY in Supabase secrets.
 * Set EMAIL_FROM (e.g. "Atlas Studio <contact@atlasstudio.com>") in secrets.
 */

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "Atlas Studio <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[MAILER] RESEND_API_KEY not set, skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[MAILER] Resend error:", err);
    throw new Error(`Email sending failed: ${res.status}`);
  }
}
