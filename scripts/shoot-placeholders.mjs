// Génère 2 shots "placeholder" pour Advist et Liass'Pilot (les URLs prod ne sont
// pas atteignables depuis certains environnements — proxy allowlist).
// Utilise les mêmes couleurs accentSoft / accentDeep que le site pour garder
// un rendu cohérent avec les vraies captures des autres apps.
// Remplace-les quand tu peux exécuter `node scripts/shoot-apps.mjs` en local.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const APPS = [
  {
    id: "advist",
    name: "Advist",
    tagline: "Workflow documentaire & signature électronique",
    soft: "#EEF2FF",
    deep: "#4338CA",
  },
  {
    id: "taxpilot",
    name: "Liass'Pilot",
    tagline: "Liasse fiscale SYSCOHADA",
    soft: "#DCF0EC",
    deep: "#0B544E",
  },
];

const OUT = resolve("public/app-shots");
mkdirSync(OUT, { recursive: true });

const html = ({ name, tagline, soft, deep }) => `<!doctype html>
<html><head><meta charset="utf-8"/><style>
  html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
  .wrap{
    width:1280px;height:760px;position:relative;overflow:hidden;
    background:
      radial-gradient(ellipse 60% 80% at 20% 30%, ${deep}14, transparent 60%),
      radial-gradient(ellipse 50% 70% at 80% 70%, ${deep}0d, transparent 60%),
      ${soft};
    display:flex;flex-direction:column;align-items:center;justify-content:center;
  }
  .dots{
    position:absolute;inset:0;
    background-image:radial-gradient(${deep}22 1px, transparent 1px);
    background-size:22px 22px;opacity:.35;
  }
  h1{
    font-size:120px;font-weight:700;letter-spacing:-3px;line-height:1;
    color:${deep};margin:0;text-align:center;
  }
  p{
    font-size:26px;font-weight:400;color:${deep};opacity:.72;
    margin:26px 0 0;letter-spacing:.2px;text-align:center;
  }
  .badge{
    position:absolute;top:36px;left:36px;
    font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;
    color:${deep};opacity:.55;
  }
  .rule{
    width:96px;height:3px;background:${deep};opacity:.35;
    margin-top:40px;border-radius:2px;
  }
</style></head>
<body><div class="wrap">
  <div class="dots"></div>
  <div class="badge">Atlas Studio</div>
  <h1>${name}</h1>
  <div class="rule"></div>
  <p>${tagline}</p>
</div></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const app of APPS) {
  await page.setContent(html(app), { waitUntil: "load" });
  const path = resolve(OUT, `${app.id}.jpg`);
  await page.screenshot({ path, type: "jpeg", quality: 85, clip: { x: 0, y: 0, width: 1280, height: 760 } });
  console.log("OK  ", app.id, "→", path);
}
await browser.close();
