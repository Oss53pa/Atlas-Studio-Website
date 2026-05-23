/**
 * AdminStatsPage.tsx — Dashboard analytique condense pour /admin/stats
 *
 * Vue rapide des KPI Atlas Studio : MRR, trials, conversion, breakdown apps,
 * trials qui expirent. Complement de /admin/analytics (vue plus profonde).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  DollarSign,
  AlarmClock,
  Users,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";

interface AppBreakdown { app_id: string; app_name: string; count: number; mrr: number }
interface TrialExpiring { user_email: string; full_name: string; app_id: string; app_name: string; trial_ends_at: string; days_left: number }

interface StatsState {
  mrr: number;
  active_subs: number;
  trial_subs: number;
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  new_subs_7d: number;
  new_subs_30d: number;
  apps_breakdown: AppBreakdown[];
  trials_expiring: TrialExpiring[];
  conversion_rate: number;
}

const DAY_MS = 86_400_000;
const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function AdminStatsPage() {
  const { appMap } = useAppCatalog();
  const [stats, setStats] = useState<StatsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useMemo(() => async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, profilesRes] = await Promise.all([
        supabase.from("subscriptions").select(
          "app_id, status, plan, price_at_subscription, created_at, cancelled_at, trial_ends_at, profiles:user_id(full_name, email)"
        ),
        supabase.from("profiles").select("id, created_at, role").eq("role", "client"),
      ]);
      if (subsRes.error) throw subsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const subs = (subsRes.data || []) as any[];
      const profiles = (profilesRes.data || []) as any[];
      const now = Date.now();
      const week_ago = now - 7 * DAY_MS;
      const month_ago = now - 30 * DAY_MS;

      const active = subs.filter((s: any) => s.status === "active");
      const trialing = subs.filter((s: any) => s.status === "trial");

      const mrr = active.reduce((sum: number, s: any) => sum + (Number(s.price_at_subscription) || 0), 0);

      const new_subs_7d = subs.filter((s: any) => new Date(s.created_at).getTime() > week_ago).length;
      const new_subs_30d = subs.filter((s: any) => new Date(s.created_at).getTime() > month_ago).length;

      const total_users = profiles.length;
      const new_users_7d = profiles.filter((p: any) => new Date(p.created_at).getTime() > week_ago).length;
      const new_users_30d = profiles.filter((p: any) => new Date(p.created_at).getTime() > month_ago).length;

      const apps_map = new Map<string, { count: number; mrr: number }>();
      for (const s of active) {
        const cur = apps_map.get(s.app_id) || { count: 0, mrr: 0 };
        apps_map.set(s.app_id, { count: cur.count + 1, mrr: cur.mrr + (Number(s.price_at_subscription) || 0) });
      }
      const apps_breakdown: AppBreakdown[] = Array.from(apps_map.entries())
        .map(([app_id, v]) => ({ app_id, app_name: appMap[app_id]?.name || app_id, ...v }))
        .sort((a, b) => b.mrr - a.mrr);

      const trials_expiring: TrialExpiring[] = trialing
        .filter((s: any) => s.trial_ends_at)
        .map((s: any) => ({
          user_email: s.profiles?.email || "—",
          full_name: s.profiles?.full_name || "—",
          app_id: s.app_id,
          app_name: appMap[s.app_id]?.name || s.app_id,
          trial_ends_at: s.trial_ends_at,
          days_left: Math.ceil((new Date(s.trial_ends_at).getTime() - now) / DAY_MS),
        }))
        .sort((a, b) => a.days_left - b.days_left);

      const conversion_rate = active.length + trialing.length > 0
        ? (active.length / (active.length + trialing.length)) * 100
        : 0;

      setStats({
        mrr,
        active_subs: active.length,
        trial_subs: trialing.length,
        total_users,
        new_users_7d,
        new_users_30d,
        new_subs_7d,
        new_subs_30d,
        apps_breakdown,
        trials_expiring,
        conversion_rate,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [appMap]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-admin-error/10 border border-red-200 dark:border-admin-error/30 text-red-700 dark:text-red-400 rounded-2xl p-6 shadow-sm dark:shadow-premium">
        {error || "Impossible de charger les statistiques."}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Tableau de bord</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">Vue rapide des KPI Atlas Studio</p>
        </div>
        <button
          onClick={() => loadStats()}
          disabled={loading}
          className="px-5 py-2.5 bg-white dark:bg-admin-surface-alt/40 border border-warm-border dark:border-white/10 rounded-full text-[13px] font-semibold text-neutral-text dark:text-admin-text/80 shadow-sm dark:shadow-none hover:border-gold/40 dark:hover:border-admin-accent/40 hover:shadow-md transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Rafraichir
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="MRR" value={`${fmt(stats.mrr)} FCFA`} sub={`${stats.active_subs} abonnements actifs`} icon={DollarSign} />
        <KpiCard label="Trials en cours" value={String(stats.trial_subs)} sub="Conversions potentielles" icon={AlarmClock} />
        <KpiCard label="Total clients" value={String(stats.total_users)} sub={`+${stats.new_users_30d} ce mois`} icon={Users} />
        <KpiCard label="Conversion" value={`${stats.conversion_rate.toFixed(0)}%`} sub="Trial → payant" icon={TrendingUp} />
      </div>

      {/* Activite recente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ActivityCard title="Activite 7 derniers jours" rows={[
          { label: "Nouveaux clients", value: stats.new_users_7d },
          { label: "Nouvelles souscriptions", value: stats.new_subs_7d },
        ]} />
        <ActivityCard title="Activite 30 derniers jours" rows={[
          { label: "Nouveaux clients", value: stats.new_users_30d },
          { label: "Nouvelles souscriptions", value: stats.new_subs_30d },
        ]} />
      </div>

      {/* Repartition par app */}
      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 mb-8 shadow-sm dark:shadow-premium">
        <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">
          Repartition par application (abonnements actifs)
        </h2>
        {stats.apps_breakdown.length === 0 ? (
          <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucun abonnement payant pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border dark:border-admin-surface-alt">
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">App</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">Abonnes</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">MRR</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2">% du MRR</th>
                </tr>
              </thead>
              <tbody>
                {stats.apps_breakdown.map((a) => {
                  const pct = stats.mrr > 0 ? (a.mrr / stats.mrr) * 100 : 0;
                  return (
                    <tr key={a.app_id} className="border-b border-warm-bg dark:border-admin-surface-alt/50 last:border-b-0">
                      <td className="py-3 pr-4 text-neutral-text dark:text-admin-text text-sm font-medium">{a.app_name}</td>
                      <td className="py-3 pr-4 text-neutral-text dark:text-admin-text/80 text-sm">{a.count}</td>
                      <td className="py-3 pr-4 text-gold dark:text-admin-accent text-sm font-mono font-semibold">{fmt(a.mrr)} FCFA</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-warm-bg dark:bg-admin-surface-alt rounded-full overflow-hidden max-w-[200px] shadow-inner">
                            <div className="h-full bg-gold dark:bg-admin-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-neutral-muted dark:text-admin-muted text-[12px] min-w-[36px]">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trials qui expirent */}
      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium">
        <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold flex items-center gap-2 mb-4">
          <AlarmClock size={16} className="text-gold dark:text-admin-accent" strokeWidth={1.5} />
          Trials en cours
          <span className="text-neutral-muted dark:text-admin-muted text-[11px] font-normal">({stats.trials_expiring.length})</span>
        </h2>
        {stats.trials_expiring.length === 0 ? (
          <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucun trial en cours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-border dark:border-admin-surface-alt">
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">Client</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">Application</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2 pr-4">Expire le</th>
                  <th className="text-left text-neutral-muted dark:text-admin-muted text-[11px] font-bold uppercase tracking-wider py-2">Restant</th>
                </tr>
              </thead>
              <tbody>
                {stats.trials_expiring.map((t, i) => {
                  const tone = t.days_left <= 0
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-admin-error/20 dark:text-red-400 dark:border-admin-error/30"
                    : t.days_left <= 3
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-admin-error/15 dark:text-red-400 dark:border-admin-error/30"
                      : t.days_left <= 7
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-admin-warning/20 dark:text-orange-400 dark:border-admin-warning/30"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-admin-success/20 dark:text-green-400 dark:border-admin-success/30";
                  return (
                    <tr key={`${t.user_email}-${t.app_id}-${i}`} className="border-b border-warm-bg dark:border-admin-surface-alt/50 last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="text-neutral-text dark:text-admin-text text-sm font-medium">{t.full_name}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{t.user_email}</div>
                      </td>
                      <td className="py-3 pr-4 text-neutral-text dark:text-admin-text/80 text-sm">{t.app_name}</td>
                      <td className="py-3 pr-4 text-neutral-text dark:text-admin-text/80 text-sm">
                        {new Date(t.trial_ends_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone}`}>
                          {t.days_left > 0 ? `${t.days_left}j` : "Expire"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<any>;
}) {
  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-elev-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider">{label}</div>
        <Icon size={18} className="text-neutral-placeholder dark:text-admin-muted/50" strokeWidth={1.5} />
      </div>
      <div className="text-gold dark:text-admin-accent text-2xl font-mono font-semibold">{value}</div>
      {sub && <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

function ActivityCard({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium">
      <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2 border-b border-warm-bg dark:border-admin-surface-alt/50 last:border-b-0">
            <span className="text-neutral-muted dark:text-admin-muted text-sm">{r.label}</span>
            <span className="text-neutral-text dark:text-admin-text font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
