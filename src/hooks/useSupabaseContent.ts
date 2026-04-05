import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CONTENT, type SiteContent } from '../config/content';

export function useSupabaseContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('key, data');

        if (error || !data || data.length === 0) {
          setContent(DEFAULT_CONTENT);
          setLoaded(true);
          return;
        }

        const contentMap: Record<string, any> = {};
        data.forEach(row => {
          contentMap[row.key] = row.data;
        });

        // Fetch apps from apps table
        const { data: appsData } = await supabase
          .from('apps')
          .select('*')
          .eq('status', 'available')
          .order('sort_order', { ascending: true });

        const dbApps = appsData && appsData.length > 0
          ? appsData.map((row: any) => ({
              id: row.id,
              name: row.name,
              type: row.type,
              tagline: row.tagline,
              desc: row.description,
              features: row.features || [],
              categories: row.categories || [],
              pricing: row.pricing || {},
              pricingPeriod: row.pricing_period || 'mois',
              color: row.color || '#C8A960',
              icon: row.icon || 'receipt',
              highlights: row.highlights || [],
              external_url: row.external_url || undefined,
            }))
          : DEFAULT_CONTENT.apps;

        // Sectors from DB come as string array, need to map to objects with icons
        const sectorNames = contentMap.sectors || [];
        const dbSectors = Array.isArray(sectorNames) && sectorNames.length > 0
          ? DEFAULT_CONTENT.sectors.filter(s => sectorNames.includes(s.name)).concat(
              sectorNames.filter((name: string) => !DEFAULT_CONTENT.sectors.find(s => s.name === name)).map((name: string) => ({ icon: DEFAULT_CONTENT.sectors[0]?.icon, name }))
            )
          : DEFAULT_CONTENT.sectors;

        setContent({
          hero: contentMap.hero || DEFAULT_CONTENT.hero,
          stats: contentMap.stats || DEFAULT_CONTENT.stats,
          trustBar: contentMap.trustBar || DEFAULT_CONTENT.trustBar,
          steps: contentMap.steps || DEFAULT_CONTENT.steps,
          apps: dbApps,
          about: contentMap.about || DEFAULT_CONTENT.about,
          sectors: dbSectors,
          testimonials: contentMap.testimonials || DEFAULT_CONTENT.testimonials,
          comparatif: contentMap.comparatif || DEFAULT_CONTENT.comparatif,
          faqs: contentMap.faqs || DEFAULT_CONTENT.faqs,
          contact: contentMap.contact || DEFAULT_CONTENT.contact,
          social: contentMap.social || undefined,
          appearance: contentMap.appearance || undefined,
        });
      } catch {
        setContent(DEFAULT_CONTENT);
      }
      setLoaded(true);
    }
    fetchContent();
  }, []);

  return { content, loaded };
}
