import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { ErrorSeverity, ErrorStatus } from './useErrorLogs';

export interface ErrorStats {
  total: number;
  critical: number;
  open: number;
  resolved: number;
  resolutionRate: number; // 0-100
  today: number;
  bySeverity: Record<ErrorSeverity, number>;
  byStatus: Record<ErrorStatus, number>;
  dailyLast7: Array<{ date: string; count: number }>;
}

const EMPTY_STATS: ErrorStats = {
  total: 0,
  critical: 0,
  open: 0,
  resolved: 0,
  resolutionRate: 0,
  today: 0,
  bySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
  byStatus: { open: 0, in_progress: 0, resolved: 0, ignored: 0 },
  dailyLast7: [],
};

interface LightRow {
  severity: ErrorSeverity;
  status: ErrorStatus;
  occurrence_count: number;
  last_seen_at: string;
  created_at: string;
}

/**
 * Stats agrégées des error_logs, optionnellement filtrées par app_id.
 * Mises à jour en temps réel via Supabase Realtime.
 */
export function useErrorStats(appId?: string) {
  const [stats, setStats] = useState<ErrorStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('error_logs')
      .select('severity,status,occurrence_count,last_seen_at,created_at')
      .order('last_seen_at', { ascending: false })
      .limit(5000);

    if (appId) query = query.eq('app_id', appId);

    const { data, error } = await query;
    if (error || !data) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }

    const rows = data as LightRow[];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const bySeverity: Record<ErrorSeverity, number> = { critical: 0, error: 0, warning: 0, info: 0 };
    const byStatus: Record<ErrorStatus, number> = { open: 0, in_progress: 0, resolved: 0, ignored: 0 };

    let total = 0;
    let critical = 0;
    let resolved = 0;
    let open = 0;
    let today = 0;

    for (const r of rows) {
      total += 1;
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (r.severity === 'critical' && r.status !== 'resolved' && r.status !== 'ignored') {
        critical += 1;
      }
      if (r.status === 'resolved') resolved += 1;
      if (r.status === 'open' || r.status === 'in_progress') open += 1;
      if (r.last_seen_at >= startOfToday) today += 1;
    }

    // Distribution sur 7 jours (bucket par date last_seen_at)
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }
    for (const r of rows) {
      const key = r.last_seen_at.slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }
    const dailyLast7 = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);

    setStats({
      total,
      critical,
      open,
      resolved,
      resolutionRate,
      today,
      bySeverity,
      byStatus,
      dailyLast7,
    });
    setLoading(false);
  }, [appId]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`error_stats_${appId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'error_logs' },
        () => { void fetchStats(); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appId, fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
