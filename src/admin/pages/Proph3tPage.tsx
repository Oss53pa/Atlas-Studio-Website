import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Brain, AlertTriangle, TrendingDown, TrendingUp, Clock, Users,
  Receipt, MessageSquare, Zap, ArrowRight, RefreshCw, Shield,
  Activity, Target, Loader2, CheckCircle2, XCircle, Bell,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { Proph3tChat } from "../components/Proph3tChat";

/* ─── Types ─── */
interface Insight {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; to: string };
  metric?: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  to: string;
  actionLabel: string;
}

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const PRIORITY_COLORS = { high: "text-red-600 bg-red-50", medium: "text-amber-600 bg-amber-50", low: "text-blue-600 bg-blue-50" };

export default function Proph3tPage() {
  const { success: toastSuccess } = useToast();
  const { appMap } = useAppCatalog();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Raw data
  const [subsData, setSubsData] = useState<any[]>([]);
  const [invoicesData, setInvoicesData] = useState<any[]>([]);
  const [ticketsData, setTicketsData] = useState<any[]>([]);
  const [profilesCount, setProfilesCount] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);

  const fetchData = async () => {
    const [subs, invoices, tickets, profiles] = await Promise.all([
      supabase.from("subscriptions").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("tickets").select("id, status, created_at, updated_at"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    setSubsData(subs.data || []);
    setInvoicesData(invoices.data || []);
    setTicketsData(tickets.data || []);
    setProfilesCount(profiles.count || 0);

    // Revenue calculations
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const paidInvoices = (invoices.data || []).filter((i: any) => i.status === "paid");
    setThisMonthRevenue(paidInvoices.filter((i: any) => new Date(i.created_at) >= thisMonthStart).reduce((s: number, i: any) => s + Number(i.amount || 0), 0));
    setLastMonthRevenue(paidInvoices.filter((i: any) => new Date(i.created_at) >= lastMonthStart && new Date(i.created_at) <= lastMonthEnd).reduce((s: number, i: any) => s + Number(i.amount || 0), 0));

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toastSuccess("Analyse actualisée");
  };

  // ─── Computed metrics ───
  const activeSubs = useMemo(() => subsData.filter(s => s.status === "active" || s.status === "trial"), [subsData]);
  const trialSubs = useMemo(() => subsData.filter(s => s.status === "trial"), [subsData]);
  const expiringTrials = useMemo(() => {
    const threeDays = Date.now() + 3 * 86400000;
    return trialSubs.filter(s => s.trial_ends_at && new Date(s.trial_ends_at).getTime() < threeDays);
  }, [trialSubs]);
  const cancelledThisMonth = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return subsData.filter(s => s.status === "cancelled" && s.cancelled_at && new Date(s.cancelled_at) >= monthStart);
  }, [subsData]);
  const pendingInvoices = useMemo(() => invoicesData.filter(i => i.status === "pending"), [invoicesData]);
  const overdueInvoices = useMemo(() => {
    const thirtyDays = Date.now() - 30 * 86400000;
    return pendingInvoices.filter(i => new Date(i.created_at).getTime() < thirtyDays);
  }, [pendingInvoices]);
  const failedPayments = useMemo(() => invoicesData.filter(i => i.status === "failed"), [invoicesData]);
  const openTickets = useMemo(() => ticketsData.filter(t => t.status === "open" || t.status === "in_progress"), [ticketsData]);
  const oldTickets = useMemo(() => {
    const twoDays = Date.now() - 48 * 3600000;
    return openTickets.filter(t => new Date(t.created_at).getTime() < twoDays);
  }, [openTickets]);

  const mrr = useMemo(() => activeSubs.reduce((s, sub) => s + Number(sub.price_at_subscription || 0), 0), [activeSubs]);
  const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

  // ─── Health Score (0-100) ───
  const healthScore = useMemo(() => {
    let score = 100;
    if (expiringTrials.length > 0) score -= Math.min(expiringTrials.length * 3, 15);
    if (cancelledThisMonth.length > 2) score -= Math.min(cancelledThisMonth.length * 4, 20);
    if (overdueInvoices.length > 0) score -= Math.min(overdueInvoices.length * 5, 25);
    if (failedPayments.length > 0) score -= Math.min(failedPayments.length * 3, 15);
    if (oldTickets.length > 0) score -= Math.min(oldTickets.length * 3, 15);
    if (revenueGrowth < -10) score -= 10;
    return Math.max(0, score);
  }, [expiringTrials, cancelledThisMonth, overdueInvoices, failedPayments, oldTickets, revenueGrowth]);

  const healthColor = healthScore >= 80 ? "text-emerald-500" : healthScore >= 60 ? "text-amber-500" : "text-red-500";
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Attention requise" : "Actions critiques nécessaires";

  // ─── Auto-generated insights ───
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];

    if (expiringTrials.length > 0) {
      list.push({
        id: "expiring-trials", severity: "warning",
        icon: <Clock size={18} />, title: `${expiringTrials.length} essai(s) expirent dans 72h`,
        description: "Ces clients risquent de ne pas convertir. Un rappel ciblé peut augmenter le taux de conversion de 30%.",
        action: { label: "Voir les abonnements", to: "/admin/subscriptions" },
        metric: `${expiringTrials.length} essais`,
      });
    }

    if (overdueInvoices.length > 0) {
      const total = overdueInvoices.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      list.push({
        id: "overdue-invoices", severity: "critical",
        icon: <Receipt size={18} />, title: `${overdueInvoices.length} facture(s) impayée(s) depuis +30 jours`,
        description: `${total.toLocaleString("fr-FR")} FCFA en souffrance. Les relances automatiques sont recommandées après 15 jours.`,
        action: { label: "Relancer les impayés", to: "/admin/invoices" },
        metric: `${total.toLocaleString("fr-FR")} FCFA`,
      });
    }

    if (failedPayments.length > 0) {
      list.push({
        id: "failed-payments", severity: "critical",
        icon: <XCircle size={18} />, title: `${failedPayments.length} paiement(s) échoué(s)`,
        description: "Des tentatives de paiement ont échoué. Contactez les clients pour mettre à jour leurs moyens de paiement.",
        action: { label: "Voir les factures", to: "/admin/invoices" },
      });
    }

    if (cancelledThisMonth.length > 2) {
      list.push({
        id: "churn-spike", severity: "warning",
        icon: <TrendingDown size={18} />, title: `${cancelledThisMonth.length} annulation(s) ce mois`,
        description: "Le taux de churn est anormalement élevé. Analysez les raisons de résiliation et considérez une enquête de satisfaction.",
        action: { label: "Analyser", to: "/admin/analytics" },
      });
    }

    if (oldTickets.length > 0) {
      list.push({
        id: "old-tickets", severity: "warning",
        icon: <MessageSquare size={18} />, title: `${oldTickets.length} ticket(s) sans réponse depuis +48h`,
        description: "Le SLA de réponse en 24h n'est pas respecté. Priorisez ces tickets pour maintenir la satisfaction client.",
        action: { label: "Traiter les tickets", to: "/admin/tickets" },
      });
    }

    if (revenueGrowth > 0) {
      list.push({
        id: "revenue-growth", severity: "success",
        icon: <TrendingUp size={18} />, title: `Revenus en hausse de ${revenueGrowth}%`,
        description: `${thisMonthRevenue.toLocaleString("fr-FR")} FCFA ce mois vs ${lastMonthRevenue.toLocaleString("fr-FR")} FCFA le mois dernier.`,
        metric: `+${revenueGrowth}%`,
      });
    } else if (revenueGrowth < 0) {
      list.push({
        id: "revenue-decline", severity: "warning",
        icon: <TrendingDown size={18} />, title: `Revenus en baisse de ${Math.abs(revenueGrowth)}%`,
        description: "Analysez les annulations et les impayés pour identifier la cause.",
        action: { label: "Voir Analytics", to: "/admin/analytics" },
      });
    }

    if (list.length === 0) {
      list.push({
        id: "all-good", severity: "success",
        icon: <CheckCircle2 size={18} />, title: "Tout est en ordre",
        description: "Aucune anomalie détectée. La plateforme fonctionne normalement.",
      });
    }

    return list;
  }, [expiringTrials, overdueInvoices, failedPayments, cancelledThisMonth, oldTickets, revenueGrowth, thisMonthRevenue, lastMonthRevenue]);

  // ─── Recommendations ───
  const recommendations = useMemo<Recommendation[]>(() => {
    const list: Recommendation[] = [];

    if (expiringTrials.length > 0)
      list.push({ id: "r1", title: `Relancer ${expiringTrials.length} essai(s) expirant(s)`, description: "Envoyez un email personnalisé avec une offre de conversion. Le taux moyen de conversion post-rappel est de 25%.", priority: "high", to: "/admin/subscriptions", actionLabel: "Voir les essais" });

    if (pendingInvoices.length > 5)
      list.push({ id: "r2", title: `Traiter ${pendingInvoices.length} factures en attente`, description: "Automatisez les rappels de paiement après 7 et 14 jours pour réduire les délais de recouvrement.", priority: "high", to: "/admin/invoices", actionLabel: "Voir les factures" });

    if (openTickets.length > 3)
      list.push({ id: "r3", title: `Prioriser ${openTickets.length} tickets ouverts`, description: "Un temps de réponse rapide (<24h) augmente la rétention client de 40%.", priority: "medium", to: "/admin/tickets", actionLabel: "Traiter" });

    if (trialSubs.length > 0 && activeSubs.length > 0) {
      const conversionRate = Math.round((activeSubs.filter(s => s.status === "active").length / (activeSubs.length + cancelledThisMonth.length)) * 100);
      if (conversionRate < 70)
        list.push({ id: "r4", title: `Taux de conversion à ${conversionRate}%`, description: "Optimisez votre onboarding et ajoutez un suivi personnalisé pour les nouveaux utilisateurs.", priority: "medium", to: "/admin/analytics", actionLabel: "Analyser" });
    }

    if (profilesCount > 0 && activeSubs.length / profilesCount < 0.5)
      list.push({ id: "r5", title: "Clients inactifs détectés", description: `${profilesCount - activeSubs.length} client(s) n'ont aucun abonnement actif. Considérez une campagne de réactivation.`, priority: "low", to: "/admin/clients", actionLabel: "Voir les clients" });

    return list;
  }, [expiringTrials, pendingInvoices, openTickets, trialSubs, activeSubs, cancelledThisMonth, profilesCount]);

  const criticalCount = insights.filter(i => i.severity === "critical").length;
  const warningCount = insights.filter(i => i.severity === "warning").length;
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1 flex items-center gap-3">
            <Brain size={24} className="text-gold dark:text-admin-accent" />
            <span className="font-logo text-gold dark:text-admin-accent text-3xl">Proph3t</span>
          </h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">Intelligence artificielle — Assistant de gestion</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setChatOpen(true)}
            className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <MessageSquare size={14} /> Parler à <span className="font-logo">Proph3t</span>
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg bg-white dark:bg-white dark:bg-admin-surface text-neutral-text dark:text-admin-text/80 text-[13px] font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualiser
          </button>
        </div>
      </div>

      {/* Health Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" className={healthColor} stroke="currentColor" strokeWidth="8"
                strokeDasharray={`${healthScore * 2.64} 264`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${healthColor}`}>{healthScore}</span>
            </div>
          </div>
          <div>
            <div className="text-neutral-text dark:text-admin-text text-lg font-semibold">Score de santé</div>
            <div className={`text-sm font-medium ${healthColor}`}>{healthLabel}</div>
            <div className="text-neutral-muted dark:text-admin-muted text-[12px] mt-1">Basé sur {insights.length} indicateurs</div>
          </div>
        </div>

        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Alertes critiques</div>
          <div className={`text-2xl font-semibold ${criticalCount > 0 ? "text-red-500" : "text-emerald-500"}`}>{criticalCount}</div>
          <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{warningCount} avertissements</div>
        </div>

        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Recommandations</div>
          <div className="text-2xl font-semibold text-gold dark:text-admin-accent">{recommendations.length}</div>
          <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{recommendations.filter(r => r.priority === "high").length} prioritaires</div>
        </div>

        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">MRR</div>
          <div className="text-2xl font-semibold text-gold dark:text-admin-accent">{fmt(mrr)}</div>
          <div className={`text-[11px] font-medium ${revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}% vs mois dernier
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mb-8">
        <h2 className="text-neutral-text dark:text-admin-text text-base font-semibold mb-4 flex items-center gap-2">
          <Zap size={16} className="text-gold dark:text-admin-accent" /> Analyses en temps réel
        </h2>
        <div className="space-y-3">
          {insights.map(insight => {
            const colors = SEVERITY_COLORS[insight.severity];
            return (
              <div key={insight.id} className={`${colors.bg} border ${colors.border} rounded-xl p-5 flex items-start gap-4`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.text} bg-white dark:bg-white dark:bg-admin-surface/60`}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${colors.text}`}>{insight.title}</span>
                    {insight.metric && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className={`text-[13px] ${colors.text} opacity-80 leading-relaxed`}>{insight.description}</p>
                </div>
                {insight.action && (
                  <Link to={insight.action.to} className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-white dark:bg-white dark:bg-admin-surface/80 ${colors.text} hover:bg-white dark:bg-white dark:bg-admin-surface transition-colors`}>
                    {insight.action.label} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-neutral-text dark:text-admin-text text-base font-semibold mb-4 flex items-center gap-2">
            <Target size={16} className="text-gold dark:text-admin-accent" /> Recommandations
          </h2>
          {recommendations.length === 0 ? (
            <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucune recommandation — tout est optimisé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map(rec => (
                <div key={rec.id} className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5 flex items-start gap-4 hover:border-gold/20 transition-colors">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${PRIORITY_COLORS[rec.priority]}`}>
                    {rec.priority === "high" ? "Urgent" : rec.priority === "medium" ? "Moyen" : "Faible"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-text dark:text-admin-text text-sm font-medium mb-0.5">{rec.title}</div>
                    <p className="text-neutral-muted dark:text-admin-muted text-[12px] leading-relaxed">{rec.description}</p>
                  </div>
                  <Link to={rec.to} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-gold dark:text-admin-accent bg-gold dark:bg-admin-accent/5 hover:bg-gold/10 dark:bg-admin-accent/10 transition-colors">
                    {rec.actionLabel} <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-neutral-text dark:text-admin-text text-base font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-gold dark:text-admin-accent" /> Actions rapides
          </h2>
          <div className="space-y-3">
            <Link to="/admin/invoices" className="block bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><Receipt size={16} /></div>
                <div>
                  <div className="text-neutral-text dark:text-admin-text text-sm font-medium group-hover:text-gold dark:text-admin-accent transition-colors">Relancer les impayés</div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{pendingInvoices.length} factures en attente</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/subscriptions" className="block bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Users size={16} /></div>
                <div>
                  <div className="text-neutral-text dark:text-admin-text text-sm font-medium group-hover:text-gold dark:text-admin-accent transition-colors">Convertir les essais</div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{trialSubs.length} essais actifs</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/tickets" className="block bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><MessageSquare size={16} /></div>
                <div>
                  <div className="text-neutral-text dark:text-admin-text text-sm font-medium group-hover:text-gold dark:text-admin-accent transition-colors">Traiter les tickets</div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{openTickets.length} en attente</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/analytics" className="block bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Activity size={16} /></div>
                <div>
                  <div className="text-neutral-text dark:text-admin-text text-sm font-medium group-hover:text-gold dark:text-admin-accent transition-colors">Rapport mensuel</div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px]">Analytics détaillées</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/system" className="block bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600"><Shield size={16} /></div>
                <div>
                  <div className="text-neutral-text dark:text-admin-text text-sm font-medium group-hover:text-gold dark:text-admin-accent transition-colors">Santé système</div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px]">Monitoring & uptime</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Proph3t */}
      <Proph3tChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
