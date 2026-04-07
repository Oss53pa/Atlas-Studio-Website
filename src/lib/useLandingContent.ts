import { useState, useEffect } from 'react';

/**
 * useLandingContent — Fetches centralized landing page content from Atlas Studio
 * Copy this file into your app's src/hooks/ directory
 *
 * Usage:
 *   const { content, loading } = useLandingContent('advist');
 *   const hero = content.hero;
 *   const pricing = content.pricing;
 */

const ATLAS_SUPABASE_URL = 'https://vgtmljfayiysuvrcmunt.supabase.co';
const ATLAS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndG1samZheWl5c3V2cmNtdW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzgyMDUsImV4cCI6MjA4NjU1NDIwNX0.a2pyz1up8ZmZk-Tl51B0v6n3eVNkBPG5L_BJAM20qt4';

interface LandingSection {
  app_id: string;
  section: string;
  data: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

interface LandingContent {
  hero?: Record<string, any>;
  stats?: Record<string, any>;
  features?: Record<string, any>;
  pricing?: Record<string, any>;
  testimonials?: Record<string, any>;
  faq?: Record<string, any>;
  cta?: Record<string, any>;
  how_it_works?: Record<string, any>;
  trust?: Record<string, any>;
  [key: string]: Record<string, any> | undefined;
}

export function useLandingContent(appId: string) {
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await window.fetch(
          `${ATLAS_SUPABASE_URL}/rest/v1/app_landing_content?app_id=eq.${appId}&is_active=eq.true&order=sort_order`,
          {
            headers: {
              apikey: ATLAS_ANON_KEY,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows: LandingSection[] = await res.json();

        const map: LandingContent = {};
        for (const row of rows) {
          map[row.section] = row.data;
        }
        setContent(map);
      } catch (err) {
        console.error('useLandingContent error:', err);
        setError((err as Error).message);
      }
      setLoading(false);
    }
    fetch();
  }, [appId]);

  return { content, loading, error };
}
