import { apiCall } from "./api";

export async function createCheckoutSession(appId: string, plan: string, priceAmount: number, paymentMethod: string = "stripe") {
  if (paymentMethod === "cinetpay") {
    const { url } = await apiCall<{ url: string }>("cinetpay-checkout", {
      method: "POST",
      body: { appId, plan, priceAmount },
    });
    window.location.href = url;
    return;
  }

  const { url } = await apiCall<{ url: string }>("create-checkout", {
    method: "POST",
    body: { appId, plan, priceAmount },
  });
  window.location.href = url;
}

export async function createRegularizationSession(subscriptionId: string, paymentMethod: string = "stripe") {
  const { url } = await apiCall<{ url: string }>("regularization-checkout", {
    method: "POST",
    body: { subscriptionId, paymentMethod },
  });
  window.location.href = url;
}

export async function createReactivationSession(subscriptionId: string, paymentMethod: string = "stripe") {
  const { url } = await apiCall<{ url: string }>("reactivation-checkout", {
    method: "POST",
    body: { subscriptionId, paymentMethod },
  });
  window.location.href = url;
}

export async function openPaymentMethodPortal() {
  const { url } = await apiCall<{ url: string }>("portal-session");
  window.location.href = url;
}
