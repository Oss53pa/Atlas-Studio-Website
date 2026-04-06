import { supabase } from "./supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Calls a Supabase Edge Function by name.
 * Example: apiCall("contact", { method: "POST", body: { name, email } })
 */
export async function apiCall<T = any>(
  functionName: string,
  options: { method?: string; body?: any; raw?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, raw = false } = options;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!raw) headers["Content-Type"] = "application/json";

  const res = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur serveur" }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  return res.json();
}
