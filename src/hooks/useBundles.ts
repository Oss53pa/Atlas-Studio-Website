import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Bundle {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  app_ids: string[];
  included: { app: string; plan: string }[];
  sum_monthly_fcfa: number;
  price_monthly_fcfa: number;
  savings_monthly_fcfa: number;
  discount_pct: number;
  is_popular: boolean;
  sort_order: number;
}

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bundles')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (!cancelled && !error && data) setBundles(data as unknown as Bundle[]);
      } catch (err) {
        if (!cancelled) console.error('useBundles error:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { bundles, loading };
}
