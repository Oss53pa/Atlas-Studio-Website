import { apiCall } from "./api";

export async function createCheckoutSession(
  appId: string,
  plan: string,
  seats: number,
  paymentMethod: string = "stripe",
  promoCode?: string,
) {
  // Le montant est recalculé côté serveur à partir du plan et du nombre de
  // sièges (jamais confié au client). On ne transmet que `seats`.
  if (paymentMethod === "cinetpay") {
    const { url } = await apiCall<{ url: string }>("cinetpay-checkout", {
      method: "POST",
      body: { appId, plan, seats, paymentMethod, promoCode },
    });
    if (!url) throw new Error("Aucune URL de paiement retournée par CinetPay");
    window.location.href = url;
    return;
  }

  const { url } = await apiCall<{ url: string }>("create-checkout", {
    method: "POST",
    body: { appId, plan, seats, paymentMethod, promoCode },
  });
  if (!url) throw new Error("Aucune URL de paiement retournée par Stripe");
  window.location.href = url;
}

export async function createBundleCheckoutSession(bundleSlug: string, paymentMethod: string = "stripe") {
  // Le prix de la suite est lu en base côté serveur ; on ne transmet que le slug.
  const { url } = await apiCall<{ url: string }>("bundle-checkout", {
    method: "POST",
    body: { bundleSlug, paymentMethod },
  });
  if (!url) throw new Error("Aucune URL de paiement retournée");
  window.location.href = url;
}

export async function createRegularizationSession(subscriptionId: string, paymentMethod: string = "stripe") {
  const { url } = await apiCall<{ url: string }>("regularization-checkout", {
    method: "POST",
    body: { subscriptionId, paymentMethod },
  });
  if (!url) throw new Error("Aucune URL de paiement retournée");
  window.location.href = url;
}

export async function createReactivationSession(subscriptionId: string, paymentMethod: string = "stripe") {
  const { url } = await apiCall<{ url: string }>("reactivation-checkout", {
    method: "POST",
    body: { subscriptionId, paymentMethod },
  });
  if (!url) throw new Error("Aucune URL de paiement retournée");
  window.location.href = url;
}

export async function openPaymentMethodPortal() {
  const { url } = await apiCall<{ url: string }>("portal-session");
  if (!url) throw new Error("Aucune URL de portail retournée");
  window.location.href = url;
}
