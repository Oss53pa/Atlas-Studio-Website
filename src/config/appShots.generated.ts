// Généré / maintenu via scripts/shoot-apps.mjs — captures d'apps (/app-shots/<id>.jpg).
// Deux voies de résolution : par id d'app (table apps) OU par domaine d'external_url
// (le contenu de la home et la page Applications n'utilisent pas les mêmes ids).
export const APP_SHOTS = new Set<string>([
  "atlas-people", "atlas-compta", "cockpit-fa", "cockpit-journey",
  "cockpit-cr", "cockpit-projet", "tablesmart", "wedo",
]);

export const APP_SHOT_BY_HOST: Record<string, string> = {
  "atlas-people.atlas-studio.org": "atlas-people",
  "atlas-fna.atlas-studio.org": "atlas-compta",
  "cockpit-fna.atlas-studio.org": "cockpit-fa",
  "cockpit-journey.atlas-studio.org": "cockpit-journey",
  "cockpit-rc.atlas-studio.org": "cockpit-cr",
  "cockpit-projet.atlas-studio.org": "cockpit-projet",
  "tablesmart.atlas-studio.org": "tablesmart",
  "wedo.atlas-studio.org": "wedo",
};

/** Résout l'id de capture d'une app (par domaine d'URL puis par id), ou null. */
export function appShotId(app: { id?: string; external_url?: string | null }): string | null {
  if (app.external_url) {
    try {
      const host = new URL(app.external_url).hostname;
      if (APP_SHOT_BY_HOST[host]) return APP_SHOT_BY_HOST[host];
    } catch { /* url invalide */ }
  }
  if (app.id && APP_SHOTS.has(app.id)) return app.id;
  return null;
}
