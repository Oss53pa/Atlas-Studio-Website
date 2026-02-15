import { useEffect, useState } from "react";
import { Users, Repeat, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminCard } from "../components/AdminCard";
import { APP_INFO } from "../../config/apps";

interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
  popular_apps: { app_id: string; sub_count: number }[] | null;
}

interface RevenueSummary {
  monthly_revenue: number;
  total_revenue: number;
  pending_payments: number;
}

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
  user_id: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, revenueRes, activityRes] = await Promise.all([
        supabase.rpc('admin_dashboard_stats'),
        supabase.rpc('admin_revenue_summary'),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (revenueRes.data) setRevenue(revenueRes.data as unknown as RevenueSummary);
      if (activityRes.data) setActivity(activityRes.data as ActivityItem[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-neutral-muted text-sm mb-7">Vue d'ensemble de votre plateforme</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminCard label="Revenus du mois" value={`${revenue?.monthly_revenue || 0} FCFA`} icon={DollarSign} />
        <AdminCard label="Revenus totaux" value={`${revenue?.total_revenue || 0} FCFA`} icon={TrendingUp} />
        <AdminCard label="Clients" value={stats?.total_users || 0} icon={Users} />
        <AdminCard label="Abonnements actifs" value={stats?.active_subscriptions || 0} icon={Repeat} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular apps */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Apps populaires</h2>
          {stats?.popular_apps && stats.popular_apps.length > 0 ? (
            <div className="space-y-3">
              {stats.popular_apps.map((app, i) => (
                <div key={app.app_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center text-gold text-[11px] font-bold">
                      {i + 1}
                    </div>
                    <span className="text-neutral-text text-sm font-medium">
                      {APP_INFO[app.app_id]?.name || app.app_id}
                    </span>
                  </div>
                  <span className="text-neutral-muted text-sm">{app.sub_count} abonnés</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune donnée disponible</p>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Activité récente</h2>
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1">
                  <span className="text-neutral-body text-[13px]">{a.action}</span>
                  <span className="text-neutral-placeholder text-[11px]">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune activité récente</p>
          )}
        </div>
      </div>

      {revenue && revenue.pending_payments > 0 && (
        <div className="mt-6 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="text-amber-700 text-sm font-semibold">
            {revenue.pending_payments} FCFA de paiements en attente
          </div>
        </div>
      )}
    </div>
  );
}
