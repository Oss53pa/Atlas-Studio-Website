import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { SiteContent } from "../config/content";

/**
 * Content management hook for the admin CMS.
 * Reads from Supabase site_content table, saves back to it.
 * No localStorage fallback, no DEFAULT_CONTENT.
 */
export function useContent() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("site_content").select("key, data");
      if (data && data.length > 0) {
        const map: Record<string, any> = {};
        data.forEach(row => { map[row.key] = row.data; });

        const { data: appsData } = await supabase.from("apps").select("*").order("sort_order");
        const apps = (appsData || []).map((row: any) => ({
          id: row.id, name: row.name, type: row.type, tagline: row.tagline,
          desc: row.description, features: row.features || [], categories: row.categories || [],
          pricing: row.pricing || {}, pricingPeriod: row.pricing_period || "mois",
          color: row.color || "#C8A960", icon: row.icon || "receipt",
          highlights: row.highlights || [], external_url: row.external_url || undefined,
        }));

        setContent({
          hero: map.hero || { title: "", subtitle: "", cta: "", ctaSecondary: "" },
          stats: map.stats || [],
          trustBar: map.trustBar || { title: "", features: [] },
          steps: map.steps || [],
          apps,
          about: map.about || { title: "", paragraphs: [] },
          sectors: map.sectors || [],
          testimonials: map.testimonials || [],
          comparatif: map.comparatif || { columns: [], rows: [] },
          faqs: map.faqs || [],
          contact: map.contact || { email: "", phone: "", address: "" },
          social: map.social,
          appearance: map.appearance,
        });
      }
      setLoaded(true);
    }
    load();
  }, []);

  const save = async (newContent: SiteContent) => {
    setContent(newContent);
    // Save each section to Supabase
    const sections = ["hero", "stats", "trustBar", "steps", "about", "sectors", "testimonials", "comparatif", "faqs", "contact", "social", "appearance"];
    for (const key of sections) {
      const value = (newContent as any)[key];
      if (value !== undefined) {
        await supabase.from("site_content").upsert({ key, data: value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
    }
  };

  const reset = async () => {
    // Don't reset to hardcoded — just refetch from DB
    setLoaded(false);
    const { data } = await supabase.from("site_content").select("key, data");
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.data; });
      setContent(map as any);
    }
    setLoaded(true);
  };

  return { content, save, reset, loaded };
}
