import { useState, useEffect } from "react";

/**
 * useSeoMeta — récupère les métadonnées SEO gérées depuis la console admin.
 *
 * La console écrit le SEO dans deux tables jsonb du projet central Atlas Studio :
 *   - site_content        (key='seo')                 → SEO du site principal
 *   - app_landing_content (app_id=X, section='seo')   → SEO d'une application
 *
 * On lit via l'API REST du projet central (même endpoint/clé que useLandingContent),
 * indépendamment de la config VITE_SUPABASE_* locale, pour toujours viser le bon projet.
 * Le SEO d'app surcharge le SEO du site.
 */

const ATLAS_SUPABASE_URL = "https://vgtmljfayiysuvrcmunt.supabase.co";
const ATLAS_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndG1samZheWl5c3V2cmNtdW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzgyMDUsImV4cCI6MjA4NjU1NDIwNX0.a2pyz1up8ZmZk-Tl51B0v6n3eVNkBPG5L_BJAM20qt4";

export interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  titleTemplate?: string;
}

async function readSeo(query: string): Promise<Partial<SeoMeta>> {
  try {
    const res = await window.fetch(`${ATLAS_SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: ATLAS_ANON_KEY, Authorization: `Bearer ${ATLAS_ANON_KEY}` },
    });
    if (!res.ok) return {};
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.data ? (rows[0].data as SeoMeta) : {};
  } catch {
    return {};
  }
}

export function useSeoMeta(appId?: string): SeoMeta {
  const [seo, setSeo] = useState<SeoMeta>({});

  useEffect(() => {
    let alive = true;
    Promise.all([
      readSeo("site_content?key=eq.seo&select=data"),
      appId
        ? readSeo(`app_landing_content?app_id=eq.${encodeURIComponent(appId)}&section=eq.seo&select=data`)
        : Promise.resolve({} as Partial<SeoMeta>),
    ]).then(([site, app]) => {
      if (alive) setSeo({ ...site, ...app, titleTemplate: (site as SeoMeta).titleTemplate });
    });
    return () => {
      alive = false;
    };
  }, [appId]);

  return seo;
}
