// Capture une image de chaque application (via son URL) pour illustrer les cartes.
// Sortie : public/app-shots/<id>.jpg  +  src/config/appShots.generated.ts (liste des ids OK)
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const APPS = [
  ["atlas-people", "https://atlas-people.atlas-studio.org/landing"],
  ["atlas-compta", "https://atlas-fna.atlas-studio.org/"],
  ["taxpilot", "https://liasspilot.atlas-studio.org/"],
  ["advist", "https://advist.atlas-studio.org/"],
  ["cockpit-fa", "https://cockpit-fna.atlas-studio.org"],
  ["atlasbanx", "https://atlasbanx.atlas-studio.org"],
  ["cockpit-journey", "https://cockpit-journey.atlas-studio.org/"],
  ["cockpit-cr", "https://cockpit-rc.atlas-studio.org"],
  ["cockpit-projet", "https://cockpit-projet.atlas-studio.org"],
  ["tablesmart", "https://tablesmart.atlas-studio.org"],
  ["wedo", "https://wedo.atlas-studio.org"],
];

const OUT = resolve("public/app-shots");
mkdirSync(OUT, { recursive: true });

const ok = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();

for (const [id, url] of APPS) {
  try {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
    }
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(4000);
    // Rejeter les pages d'erreur / vides (déploiement absent, 404, crash…)
    const title = await page.title().catch(() => "");
    const body = await page.evaluate(() => (document.body?.innerText || "").slice(0, 500)).catch(() => "");
    if (/NOT_FOUND|DEPLOYMENT_NOT_FOUND|404|Application error|page could not be found|does not exist|ERR_/i.test(title + " " + body) || body.trim().length < 25) {
      throw new Error("page d'erreur/vide: " + (title || body.slice(0, 40)).trim());
    }
    await page.screenshot({
      path: resolve(OUT, `${id}.jpg`), type: "jpeg", quality: 78,
      clip: { x: 0, y: 0, width: 1280, height: 760 },
    });
    console.log("OK  ", id, url);
    ok.push([id, new URL(url).hostname]);
  } catch (e) {
    console.log("FAIL", id, url, "-", (e && e.message || e).slice(0, 80));
  }
}
await browser.close();

const ids = ok.map(([id]) => id);
const byHost = Object.fromEntries(ok.map(([id, host]) => [host, id]));
const ts = `// Généré / maintenu via scripts/shoot-apps.mjs — captures d'apps (/app-shots/<id>.jpg).
// Deux voies de résolution : par id d'app (table apps) OU par domaine d'external_url
// (le contenu de la home et la page Applications n'utilisent pas les mêmes ids).
export const APP_SHOTS = new Set<string>(${JSON.stringify(ids)});

export const APP_SHOT_BY_HOST: Record<string, string> = ${JSON.stringify(byHost, null, 2)};

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
`;
writeFileSync(resolve("src/config/appShots.generated.ts"), ts);
console.log(`\n${ok.length}/${APPS.length} captures OK`);
