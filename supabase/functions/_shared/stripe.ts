import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

// IMPORTANT : ne PAS throw au top-level si STRIPE_SECRET_KEY est absent.
// Plusieurs fonctions importent ce module de façon transitive (via
// _shared/asvc/payments.ts → asvc-execute-action, etc.) sans réellement
// utiliser Stripe ; un throw ici crashe la worker Deno à l'import
// (WORKER_ERROR en quelques ms). Placeholder = OK : la lib accepte
// n'importe quelle string ; les appels API échoueront proprement (auth)
// si la clé n'est pas configurée — au lieu de tuer la fonction entière.
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "sk_test_placeholder_not_configured";

export const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});
