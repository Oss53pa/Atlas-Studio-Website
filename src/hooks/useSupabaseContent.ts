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

        setContent({
          hero: contentMap.hero || DEFAULT_CONTENT.hero,
          stats: contentMap.stats || DEFAULT_CONTENT.stats,
          apps: DEFAULT_CONTENT.apps,
          about: contentMap.about || DEFAULT_CONTENT.about,
          sectors: DEFAULT_CONTENT.sectors,
          testimonials: contentMap.testimonials || DEFAULT_CONTENT.testimonials,
          faqs: contentMap.faqs || DEFAULT_CONTENT.faqs,
          contact: contentMap.contact || DEFAULT_CONTENT.contact,
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
