import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CONTENT } from '../config/content';
import type { SiteContent } from '../config/content';

export function useSupabaseContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error: fetchError } = await supabase
          .from('site_content')
          .select('key, data');

        if (fetchError) {
          console.error('useSupabaseContent error:', fetchError.message);
          setError(fetchError.message);
          setLoaded(true);
          return;
        }

        const contentMap: Record<string, any> = {};
        (data || []).forEach(row => {
          contentMap[row.key] = row.data;
        });

        // Fetch apps from apps table
        const { data: appsData } = await supabase
          .from('apps')
          .select('*')
          .eq('status', 'available')
          .order('sort_order', { ascending: true });

        const dbApps = (appsData || []).map((row: any) => ({
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
        }));

        // Sectors from DB — map names to Lucide icons from defaults
        const sectorData = contentMap.sectors;
        const sectorIconMap = new Map(DEFAULT_CONTENT.sectors.map(s => [s.name, s.icon]));
        const fallbackIcon = DEFAULT_CONTENT.sectors[0]?.icon;
        const dbSectors = Array.isArray(sectorData) && sectorData.length > 0
          ? sectorData.map((s: any) => {
              if (typeof s === 'string') {
                return { icon: sectorIconMap.get(s) || fallbackIcon, name: s };
              }
              if (s.name && !s.icon) {
                return { icon: sectorIconMap.get(s.name) || fallbackIcon, name: s.name };
              }
              return s;
            })
          : DEFAULT_CONTENT.sectors;

        setContent({
          hero: contentMap.hero || DEFAULT_CONTENT.hero,
          stats: contentMap.stats || DEFAULT_CONTENT.stats,
          trustBar: contentMap.trustBar || DEFAULT_CONTENT.trustBar,
          steps: contentMap.steps || DEFAULT_CONTENT.steps,
          apps: dbApps.length > 0 ? dbApps : DEFAULT_CONTENT.apps,
          about: contentMap.about || DEFAULT_CONTENT.about,
          sectors: dbSectors,
          testimonials: contentMap.testimonials || DEFAULT_CONTENT.testimonials,
          comparatif: contentMap.comparatif || DEFAULT_CONTENT.comparatif,
          faqs: contentMap.faqs || DEFAULT_CONTENT.faqs,
          contact: contentMap.contact || DEFAULT_CONTENT.contact,
          social: contentMap.social || undefined,
          appearance: contentMap.appearance || undefined,
        });
      } catch (err) {
        console.error('useSupabaseContent unexpected error:', err);
        setError('Erreur de chargement du contenu');
      }
      setLoaded(true);
    }
    fetchContent();
  }, []);

  return { content, loaded, error };
}
