import { next } from "@vercel/edge";

/**
 * Injection des métadonnées SEO/Open Graph dans le HTML initial.
 *
 * Pourquoi : le site est une SPA. react-helmet (SEOHead) pose bien les balises
 * côté client, ce qui suffit à Google (qui exécute le JS) — mais PAS aux
 * scrapers sociaux (Facebook, LinkedIn, WhatsApp, X) qui ne lisent que le HTML
 * initial. Sans cette middleware, les partages de liens n'affichent ni titre,
 * ni description, ni image.
 *
 * Source des données : le module SEO de la console admin, qui écrit dans
 *   site_content(key='seo')               → SEO du site principal
 *   app_landing_content(section='seo')    → SEO d'une application
 *
 * Sécurité de fonctionnement :
 *   - Toute erreur (réseau, parsing, Supabase indisponible) ⇒ next(), le site
 *     est servi normalement. Jamais de 500 imputable à ce fichier.
 *   - Si aucun SEO n'est renseigné, on ne réécrit rien (no-op).
 *   - Le contenu visible est identique pour tous : on n'ajoute que des balises
 *     <head>, jamais de contenu différencié (pas de cloaking).
 */

export const config = {
  matcher: ["/", "/applications/:path*"],
};

const SUPABASE_URL = "https://vgtmljfayiysuvrcmunt.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndG1samZheWl5c3V2cmNtdW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzgyMDUsImV4cCI6MjA4NjU1NDIwNX0.a2pyz1up8ZmZk-Tl51B0v6n3eVNkBPG5L_BJAM20qt4";

const SITE_URL = "https://atlas-studio.org";

interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  titleTemplate?: string;
}

async function readSeo(query: string): Promise<Partial<Seo>> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) return {};
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.data ? (rows[0].data as Seo) : {};
  } catch {
    return {};
  }
}

function esc(s = ""): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildTags(seo: Seo, pageUrl: string): string {
  const rawTitle =
    seo.titleTemplate && seo.metaTitle ? seo.titleTemplate.replace("%s", seo.metaTitle) : seo.metaTitle;
  const title = esc(rawTitle || "");
  const desc = esc(seo.metaDescription || "");
  const image = esc(seo.ogImage || `${SITE_URL}/og-image.png`);
  const canonical = esc(seo.canonical || pageUrl);
  const card = seo.ogImage ? "summary_large_image" : "summary";

  return [
    title && `<title>${title}</title>`,
    desc && `<meta name="description" content="${desc}" />`,
    seo.keywords && `<meta name="keywords" content="${esc(seo.keywords)}" />`,
    `<meta name="robots" content="${seo.noindex ? "noindex, nofollow" : "index, follow"}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    title && `<meta property="og:title" content="${title}" />`,
    desc && `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="${card}" />`,
    title && `<meta name="twitter:title" content="${title}" />`,
    desc && `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export default async function middleware(req: Request) {
  try {
    // Seules les navigations HTML nous intéressent (pas les assets, ni fetch/XHR).
    if (!(req.headers.get("accept") || "").includes("text/html")) return next();

    const url = new URL(req.url);
    const match = url.pathname.match(/^\/applications\/([^/]+)\/?$/);
    const appId = match ? decodeURIComponent(match[1]) : undefined;

    const [site, app] = await Promise.all([
      readSeo("site_content?key=eq.seo&select=data"),
      appId
        ? readSeo(`app_landing_content?app_id=eq.${encodeURIComponent(appId)}&section=eq.seo&select=data`)
        : Promise.resolve({} as Partial<Seo>),
    ]);

    const seo: Seo = { ...site, ...app, titleTemplate: (site as Seo).titleTemplate };

    // Rien de configuré côté console ⇒ on ne touche pas au HTML.
    if (!seo.metaTitle && !seo.metaDescription && !seo.ogImage) return next();

    const shell = await fetch(new URL("/index.html", url.origin));
    if (!shell.ok) return next();
    let html = await shell.text();

    // Retire le <title> et la <meta description> statiques pour éviter les doublons.
    html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
    html = html.replace(/<meta\s+name="description"[^>]*>\s*/i, "");
    html = html.replace("</head>", `  ${buildTags(seo, url.href)}\n  </head>`);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Le navigateur revalide (parité avec vercel.json) ; le CDN garde une
        // copie courte. Un déploiement purge le cache edge → pas de version périmée.
        "cache-control": "public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch {
    return next();
  }
}
