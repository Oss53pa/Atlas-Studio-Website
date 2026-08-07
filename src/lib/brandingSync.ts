/**
 * brandingSync.ts — Resync du branding d'app dans `raw_user_meta_data`.
 *
 * Pose la palette de l'app (nom, tagline, accent, wordmark) sur l'utilisateur
 * Supabase, pour que les **templates Auth natifs** (Magic Link / Confirm signup
 * / Reset password, versionnés dans la Console Admin `emails/*.harmonise.html`)
 * s'affichent aux couleurs de l'app. Source unique : `public.apps`.
 *
 * Appelé au moment du lancement d'une app (resync après login). Non bloquant :
 * le branding est cosmétique, un échec ne doit jamais empêcher l'accès.
 *
 * ⚠️ Limite structurelle : `raw_user_meta_data` est par utilisateur, pas par
 * envoi → « la dernière app gagne ». Pour les e-mails déclenchés côté serveur
 * (admin-clients / admin-reset-password), le portail utilise déjà un rendu à
 * contexte par requête (`supabase/functions/_shared/authEmail.ts`) qui n'a pas
 * cette limite. Ce helper couvre les flux Auth natifs restants.
 *
 * ── Réutilisation satellites ──
 * Ce module est volontairement autonome (une seule dépendance : le client
 * Supabase). Pour aligner un satellite, copier ce fichier et appeler
 * `syncAppBranding("<app_id_du_satellite>")` après authentification.
 */
import { supabase } from "./supabase";

const WORDMARK_CDN =
  "https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks";

/** Repli neutre — famille Atlas Studio (sauge). */
const NEUTRAL = {
  app: "Atlas Studio",
  app_tagline: "L'écosystème Atlas Studio",
  app_accent: "#6E8B58",
  app_accent_deep: "#52693F",
  app_accent_soft: "#EEF4E9",
  app_wordmark: `${WORDMARK_CDN}/wm-atlas-studio.png`,
};

export interface AppBrandingMeta {
  app: string;
  app_id: string;
  app_tagline: string;
  app_accent: string;
  app_accent_deep: string;
  app_accent_soft: string;
  app_wordmark: string;
}

/**
 * Résout la palette de `appId` depuis `public.apps` et la pose sur l'utilisateur.
 * Tolérant : `select("*")` pour ne pas casser si la migration branding
 * (accent_deep / accent_soft / wordmark_url) n'est pas encore appliquée.
 */
export async function syncAppBranding(appId: string): Promise<void> {
  try {
    const { data } = await supabase.from("apps").select("*").eq("id", appId).single();
    const row = (data ?? {}) as Record<string, unknown>;
    const str = (v: unknown, fallback: string) =>
      typeof v === "string" && v.trim() ? v : fallback;

    const meta: AppBrandingMeta = {
      app: str(row.name, NEUTRAL.app),
      app_id: appId,
      app_tagline: str(row.tagline, NEUTRAL.app_tagline),
      app_accent: str(row.color, NEUTRAL.app_accent),
      app_accent_deep: str(row.accent_deep, NEUTRAL.app_accent_deep),
      app_accent_soft: str(row.accent_soft, NEUTRAL.app_accent_soft),
      app_wordmark: str(row.wordmark_url, NEUTRAL.app_wordmark),
    };

    await supabase.auth.updateUser({ data: meta });
  } catch (e) {
    // Non bloquant — le branding des e-mails est cosmétique.
    console.warn("[brandingSync] resync échoué (non bloquant):", e);
  }
}
