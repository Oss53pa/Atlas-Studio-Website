import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AppItem } from '../config/content';
import type { AppStatus } from '../lib/database.types';

export interface AppItemWithStatus extends AppItem {
  status: AppStatus;
}

export function useApps() {
  const [apps, setApps] = useState<AppItemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = async (signal?: { cancelled: boolean }) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('apps')
        .select('*')
        .order('sort_order', { ascending: true });

      if (signal?.cancelled) return;

      if (fetchError) {
        console.error('useApps fetch error:', fetchError.message);
        setError(fetchError.message);
        setApps([]);
      } else {
        setApps((data || []).map(row => ({
          id: row.id,
          name: row.name,
          type: row.type as AppItem['type'],
          tagline: row.tagline,
          desc: row.description,
          features: row.features || [],
          categories: row.categories || [],
          pricing: row.pricing as Record<string, number>,
          pricingPeriod: (row as any).pricing_period || 'mois',
          color: (row as any).color || '#C8A960',
          icon: (row as any).icon || 'receipt',
          highlights: (row as any).highlights || [],
          external_url: row.external_url || undefined,
          status: row.status as AppStatus,
        })));
        setError(null);
      }
    } catch (err) {
      if (signal?.cancelled) return;
      // Silence les AbortError : le user a navigué avant la fin du fetch
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') return;
      console.error('useApps unexpected error:', err);
      setError('Erreur de chargement des applications');
      setApps([]);
    }
    if (!signal?.cancelled) setLoading(false);
  };

  useEffect(() => {
    const signal = { cancelled: false };
    void fetchApps(signal);
    return () => { signal.cancelled = true; };
  }, []);

  return { apps, loading, error, refetch: () => fetchApps() };
}
