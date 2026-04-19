// Traduit les erreurs techniques (Supabase/Postgres/auth) en messages FR clairs pour l'UI.
// À utiliser partout où un showError(err.message) brut pourrait apparaître.

interface MaybeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export function formatSupabaseError(err: unknown, fallback = "Une erreur est survenue"): string {
  if (!err) return fallback;
  if (typeof err === "string") return translateMessage(err) || err || fallback;

  const e = err as MaybeError;
  const raw = (e.message || "").toLowerCase();
  const code = (e.code || "").toUpperCase();

  // Postgres error codes (https://www.postgresql.org/docs/current/errcodes-appendix.html)
  if (code === "42501" || raw.includes("row-level security") || raw.includes("violates row-level") || raw.includes("permission denied")) {
    return "Vous n'êtes pas autorisé à effectuer cette action.";
  }
  if (code === "23505" || raw.includes("duplicate key") || raw.includes("already exists")) {
    return "Cet élément existe déjà.";
  }
  if (code === "23503" || raw.includes("foreign key")) {
    return "Cet élément est lié à d'autres ressources — impossible de le supprimer.";
  }
  if (code === "23502" || raw.includes("not-null") || raw.includes("null value in column")) {
    return "Un champ obligatoire est manquant.";
  }
  if (code === "23514" || raw.includes("violates check constraint")) {
    return "Une des valeurs saisies n'est pas valide.";
  }
  if (code === "PGRST116" || raw.includes("0 rows") || raw.includes("no rows")) {
    return "Élément introuvable.";
  }
  if (code === "PGRST204" || (raw.includes("could not find") && raw.includes("column"))) {
    return "Base de données non à jour (migration manquante). Contactez l'équipe technique.";
  }
  if (raw.includes("jwt") || raw.includes("expired") || e.status === 401) {
    return "Session expirée — reconnectez-vous.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (raw.includes("email not confirmed")) {
    return "Email non confirmé. Vérifiez votre boîte de réception.";
  }
  if (raw.includes("rate limit") || e.status === 429) {
    return "Trop de requêtes — patientez quelques secondes.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Problème de connexion réseau. Réessayez.";
  }
  if (e.status && e.status >= 500) {
    return "Le service est momentanément indisponible. Réessayez dans un instant.";
  }

  const translated = translateMessage(e.message || "");
  return translated || e.message || fallback;
}

function translateMessage(msg: string): string | null {
  const m = msg.toLowerCase();
  if (m.includes("network") || m.includes("failed to fetch")) return "Problème de connexion réseau. Réessayez.";
  if (m.includes("timeout")) return "Délai dépassé — réessayez.";
  return null;
}
