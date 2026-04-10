import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';
export type ErrorStatus = 'open' | 'in_progress' | 'resolved' | 'ignored';

export interface ErrorLog {
  id: string;
  app_id: string;
  app_version: string | null;
  environment: 'production' | 'staging' | 'dev';
  severity: ErrorSeverity;
  message: string;
  stack_trace: string | null;
  component_name: string | null;
  action_context: string | null;
  fingerprint: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  user_id: string | null;
  tenant_id: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  status: ErrorStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface ErrorLogFilters {
  appId?: string;               // undefined = toutes les apps
  severities?: ErrorSeverity[];  // vide = toutes
  statuses?: ErrorStatus[];      // vide = tous
  dateFrom?: string;             // ISO
  dateTo?: string;               // ISO
  search?: string;
}

/**
 * Liste paginée des error_logs avec filtres + realtime.
 * Tri par défaut : last_seen_at DESC.
 */
export function useErrorLogs(filters: ErrorLogFilters = {}) {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabiliser la référence pour éviter des refetch en boucle
  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    [filters],
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('error_logs')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(500);

    if (filters.appId) {
      query = query.eq('app_id', filters.appId);
    }
    if (filters.severities && filters.severities.length > 0) {
      query = query.in('severity', filters.severities);
    }
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }
    if (filters.dateFrom) {
      query = query.gte('last_seen_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('last_seen_at', filters.dateTo);
    }
    if (filters.search && filters.search.trim()) {
      query = query.ilike('message', `%${filters.search.trim()}%`);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setLogs([]);
    } else {
      setLogs((data || []) as ErrorLog[]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  // Realtime : re-fetch sur tout changement de la table
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel(`error_logs_feed_${filtersKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'error_logs' },
        () => { void fetchLogs(); },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [filtersKey, fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

/**
 * Met à jour le statut et la note de résolution d'une erreur.
 */
export async function updateErrorStatus(
  id: string,
  patch: {
    status: ErrorStatus;
    resolution_note?: string | null;
    resolved_by?: string | null;
  },
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {
    status: patch.status,
    resolution_note: patch.resolution_note ?? null,
  };

  if (patch.status === 'resolved') {
    update.resolved_at = new Date().toISOString();
    update.resolved_by = patch.resolved_by ?? null;
  } else {
    update.resolved_at = null;
    update.resolved_by = null;
  }

  const { error } = await supabase
    .from('error_logs')
    .update(update)
    .eq('id', id);

  return { error: error?.message ?? null };
}
