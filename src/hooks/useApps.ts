import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CONTENT, type AppItem } from '../config/content';
import type { AppStatus } from '../lib/database.types';

export interface AppItemWithStatus extends AppItem {
  status: AppStatus;
}

export function useApps() {
  const [apps, setApps] = useState<AppItemWithStatus[]>(
    DEFAULT_CONTENT.apps.map(a => ({ ...a, status: 'available' as AppStatus }))
  );
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        setApps(DEFAULT_CONTENT.apps.map(a => ({ ...a, status: 'available' as AppStatus })));
      } else {
        setApps(data.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type as AppItem['type'],
          tagline: row.tagline,
          desc: row.description,
          features: row.features || [],
          categories: row.categories || [],
          pricing: row.pricing as Record<string, number>,
          status: row.status as AppStatus,
        })));
      }
    } catch {
      setApps(DEFAULT_CONTENT.apps.map(a => ({ ...a, status: 'available' as AppStatus })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  return { apps, loading, refetch: fetchApps };
}
