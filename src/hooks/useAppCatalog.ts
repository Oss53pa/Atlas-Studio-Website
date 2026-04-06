import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AppRow } from '../lib/database.types';

/**
 * Shared hook that fetches apps from Supabase and returns a map by ID.
 * Replaces the old hardcoded APP_INFO object everywhere in portal/admin.
 */
export function useAppCatalog() {
  const [appMap, setAppMap] = useState<Record<string, AppRow>>({});
  const [appList, setAppList] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('useAppCatalog fetch error:', error.message);
      }

      if (data && data.length > 0) {
        const map: Record<string, AppRow> = {};
        for (const row of data) {
          map[row.id] = row as AppRow;
        }
        setAppMap(map);
        setAppList(data as AppRow[]);
      }
    } catch (err) {
      console.error('useAppCatalog unexpected error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  return { appMap, appList, loading, refetch: fetchApps };
}
