import { useMemo, useState } from "react";
import {
  Rocket,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Receipt,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  KeyRound,
  TrendingUp,
  CalendarClock,
  MoreVertical,
  Plus,
} from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { PaymentMethodSelector } from "../../components/ui/PaymentMethodSelector";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { createRegularizationSession, createReactivationSession } from "../../lib/payments";
import type { Subscription, SubscriptionStatus } from "../../lib/database.types";

interface MyAppsPageProps {
  userId: string | undefined;
  onOpenApp: (id: string) => void;
  onNavigate: (p: string) => void;
}

type FilterTab = "all" | "active" | "trial" | "attention";

const STATUS_META: Record<
  SubscriptionStatus,
  { label: string; tone: "emerald" | "blue" | "amber" | "red" | "neutral"; Icon: typeof CheckCircle2 }
> = {
  active:        { label: "Actif",         tone: "emerald", Icon: CheckCircle2 },
  trial:         { label: "Essai",         tone: "blue",    Icon: Sparkles },
  suspended:     { label: "Suspendu",      tone: "amber",   Icon: AlertTriangle },
  past_due:      { label: "Paiement dû",   tone: "amber",   Icon: AlertTriangle },
  degraded:      { label: "Dégradé",       tone: "amber",   Icon: AlertTriangle },
  cancelled:     { label: "Annulé",        tone: "red",     Icon: XCircle },
  cancelled_eop: { label: "Fin de période",tone: "amber",   Icon: Clock },
  expired:       { label: "Expiré",        tone: "neutral", Icon: XCircle },
};

const TONE_CLASSES: Record<"emerald" | "blue" | "amber" | "red" | "neutral", string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue:    "bg-sky-50    text-sky-700    border-sky-200",
  amber:   "bg-amber-50  text-amber-700  border-amber-200",
  red:     "bg-red-50    text-red-700    border-red-200",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const PROGRESS_TONES = {
  high:   "bg-emerald-500",
  medium: "bg-amber-500",
  low:    "bg-red-500",
} as const;

export function MyAppsPage({ userId, onOpenApp, onNavigate }: MyAppsPageProps) {
  const { subscriptions, loading: subsLoading } = useSubscriptions(userId);
  const { appMap, loading: appsLoading } = useAppCatalog();
  const [paymentModal, setPaymentModal] = useState<{ subId: string; type: "regularize" | "reactivate" } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const loading = subsLoading || appsLoading;

  // ─── Derive stats + filtered list ───────────────────────────────────────
  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active" || s.status === "trial");
    const trial = subscriptions.filter((s) => s.status === "trial");
    const attention = subscriptions.filter((s) =>
      ["suspended", "past_due", "degraded", "cancelled", "cancelled_eop"].includes(s.status),
    );

    const monthlyTotal = active.reduce((sum, s) => sum + Number(s.price_at_subscription || 0), 0);

    const nextExpiring = active
      .filter((s) => s.current_period_end)
      .sort((a, b) => new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime())[0];

    return {
      activeCount: active.length,
      trialCount: trial.length,
      attentionCount: attention.length,
      monthlyTotal,
      nextExpiring,
      total: subscriptions.length,
    };
  }, [subscriptions]);

  const filteredSubs = useMemo(() => {
    if (filter === "all") return subscriptions;
    if (filter === "active") return subscriptions.filter((s) => s.status === "active");
    if (filter === "trial") return subscriptions.filter((s) => s.status === "trial");
    return subscriptions.filter((s) =>
      ["suspended", "past_due", "degraded", "cancelled", "cancelled_eop", "expired"].includes(s.status),
    );
  }, [subscriptions, filter]);

  const handlePaymentAction = async () => {
    if (!paymentModal) return;
    setProcessing(true);
    try {
      if (paymentModal.type === "regularize") {
        await createRegularizationSession(paymentModal.subId, paymentMethod);
      } else {
        await createReactivationSession(paymentModal.subId, paymentMethod);
      }
    } catch {
      setProcessing(false);
      setPaymentModal(null);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (subscriptions.length === 0) {
    return <EmptyState onNavigate={onNavigate} />;
  }

  return (
    <div className="max-w-6xl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Mes Applications</h1>
          <p className="text-neutral-muted text-sm">
            Gérez vos abonnements et accédez à vos outils
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("catalog")}
          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 text-[13px] font-semibold transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Ajouter une application
        </button>
      </div>

      {/* ─── Stats strip ─────────────────────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={CheckCircle2}
          label="Applications actives"
          value={String(stats.activeCount)}
          hint={stats.total > stats.activeCount ? `sur ${stats.total} au total` : "toutes opérationnelles"}
          tone="emerald"
        />
        <StatTile
          icon={TrendingUp}
          label="Total mensuel"
          value={formatFcfa(stats.monthlyTotal)}
          hint="HT, hors essais"
          tone="neutral"
        />
        <StatTile
          icon={CalendarClock}
          label="Prochaine échéance"
          value={
            stats.nextExpiring
              ? formatRelativeDays(daysUntil(stats.nextExpiring.current_period_end))
              : "—"
          }
          hint={
            stats.nextExpiring
              ? formatDateShort(stats.nextExpiring.current_period_end)
              : "aucune échéance"
          }
          tone={
            stats.nextExpiring && daysUntil(stats.nextExpiring.current_period_end) <= 7
              ? "amber"
              : "neutral"
          }
        />
        <StatTile
          icon={AlertTriangle}
          label="Nécessitant attention"
          value={String(stats.attentionCount)}
          hint={stats.attentionCount === 0 ? "tout est en ordre" : "à régulariser"}
          tone={stats.attentionCount > 0 ? "amber" : "neutral"}
        />
      </section>

      {/* ─── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-1.5 flex-wrap">
        {([
          { id: "all", label: "Toutes", count: stats.total },
          { id: "active", label: "Actives", count: subscriptions.filter((s) => s.status === "active").length },
          { id: "trial", label: "Essais", count: stats.trialCount },
          { id: "attention", label: "Attention", count: stats.attentionCount },
        ] satisfies { id: FilterTab; label: string; count: number }[])
          .filter((tab) => tab.id === "all" || tab.count > 0)
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12.5px] font-medium transition-colors ${
                filter === tab.id
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-warm-border bg-white text-neutral-muted hover:border-neutral-300 hover:text-neutral-text"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10.5px] font-semibold ${
                  filter === tab.id ? "text-emerald-600" : "text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
      </div>

      {/* ─── Cards grid ──────────────────────────────────────────────────── */}
      {filteredSubs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-warm-border bg-warm-bg/50 py-12 text-center">
          <p className="text-neutral-muted text-sm">Aucune application dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSubs.map((sub) => {
            const info = appMap[sub.app_id];
            const appName = info?.name || sub.app_id;
            const tagline = info?.tagline;
            const monthlyPrice = Number(sub.price_at_subscription || 0);

            return (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                appName={appName}
                tagline={tagline}
                monthlyPrice={monthlyPrice}
                menuOpen={openMenu === sub.id}
                onToggleMenu={() => setOpenMenu(openMenu === sub.id ? null : sub.id)}
                onCloseMenu={() => setOpenMenu(null)}
                onOpenApp={() => onOpenApp(sub.app_id)}
                onPaymentModal={(type) => setPaymentModal({ subId: sub.id, type })}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      )}

      {/* ─── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("catalog")}
          className="group text-left bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-200/60 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Rocket size={17} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-neutral-text text-[14px] font-semibold mb-0.5">
                Découvrir d'autres applications
              </h3>
              <p className="text-neutral-muted text-[12.5px] leading-snug">
                Atlas Studio propose 14 applications SaaS pour gérer votre activité OHADA.
                Voir le catalogue complet →
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("activate")}
          className="group text-left bg-white border border-warm-border rounded-2xl p-5 hover:border-neutral-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <KeyRound size={17} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-neutral-text text-[14px] font-semibold mb-0.5">
                Activer une licence
              </h3>
              <p className="text-neutral-muted text-[12.5px] leading-snug">
                Vous avez reçu une clé de licence ? Activez-la pour débloquer
                votre accès →
              </p>
            </div>
          </div>
        </button>
      </section>

      {/* ─── Payment method modal ───────────────────────────────────────── */}
      {paymentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setPaymentModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 max-w-md w-full border border-warm-border shadow-2xl"
          >
            <h3 className="text-neutral-text text-lg font-bold mb-4">
              {paymentModal.type === "regularize" ? "Régulariser le paiement" : "Réactiver l'abonnement"}
            </h3>
            <div className="mb-6">
              <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
            </div>
            <button
              onClick={handlePaymentAction}
              disabled={processing}
              className={`btn-gold w-full ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {processing ? "Redirection..." : "Procéder au paiement"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function SubscriptionCard({
  sub,
  appName,
  tagline,
  monthlyPrice,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpenApp,
  onPaymentModal,
  onNavigate,
}: {
  sub: Subscription;
  appName: string;
  tagline?: string;
  monthlyPrice: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onOpenApp: () => void;
  onPaymentModal: (type: "regularize" | "reactivate") => void;
  onNavigate: (page: string) => void;
}) {
  const statusMeta = STATUS_META[sub.status] ?? STATUS_META.expired;
  const StatusIcon = statusMeta.Icon;
  const isActive = sub.status === "active" || sub.status === "trial";
  const isTrial = sub.status === "trial";
  const days = daysUntil(sub.current_period_end);
  const totalDays = isTrial
    ? 14
    : Math.max(1, Math.round((new Date(sub.current_period_end).getTime() - new Date(sub.current_period_start).getTime()) / 86400000));
  const progressPct = Math.max(0, Math.min(100, (days / totalDays) * 100));
  const progressTone: keyof typeof PROGRESS_TONES =
    days <= 7 ? "low" : days <= 30 ? "medium" : "high";

  return (
    <div
      className="group relative bg-white border border-warm-border rounded-2xl p-5 hover:shadow-lg hover:border-neutral-300 transition-all duration-300"
    >
      {/* ── Top row : logo + status + menu ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <AppLogo name={appName} size={24} color="text-emerald-700" />
          {tagline && (
            <p className="text-neutral-muted text-[12px] mt-1 line-clamp-1">{tagline}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${TONE_CLASSES[statusMeta.tone]}`}
          >
            <StatusIcon size={11} strokeWidth={2} />
            {statusMeta.label}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Plus d'actions"
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                <div className="absolute right-0 top-7 z-20 w-52 rounded-lg border border-warm-border bg-white shadow-xl py-1">
                  <MenuItem
                    icon={Receipt}
                    label="Voir les factures"
                    onClick={() => {
                      onCloseMenu();
                      onNavigate("billing");
                    }}
                  />
                  <MenuItem
                    icon={SettingsIcon}
                    label="Gérer l'abonnement"
                    onClick={() => {
                      onCloseMenu();
                      onNavigate("subscription");
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Plan + prix ── */}
      <div className="flex items-center justify-between mb-3 text-[12.5px]">
        <span className="text-neutral-muted">
          Plan{" "}
          <span className="text-neutral-text font-medium">
            {sub.plan?.charAt(0).toUpperCase() + sub.plan?.slice(1)}
          </span>
        </span>
        {monthlyPrice > 0 && (
          <span className="text-neutral-muted font-mono text-[11.5px]">
            {formatFcfa(monthlyPrice)} HT / mois
          </span>
        )}
      </div>

      {/* ── Progress bar (active uniquement) ── */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11.5px] mb-1.5">
            <span className="text-neutral-muted">
              {isTrial ? "Essai gratuit — " : ""}
              <span className={`font-semibold ${days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-700" : "text-neutral-text"}`}>
                {days > 0 ? `${days} jour${days > 1 ? "s" : ""} restants` : "Expiré"}
              </span>
            </span>
            <span className="text-neutral-400 font-mono text-[11px]">
              {formatDateShort(sub.current_period_end)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full ${PROGRESS_TONES[progressTone]} transition-all duration-500`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── État non-actif : message ── */}
      {!isActive && (
        <div
          className={`mb-4 text-[12.5px] inline-flex items-center gap-1.5 ${
            sub.status === "suspended" || sub.status === "past_due" ? "text-amber-700" : "text-red-600"
          }`}
        >
          <AlertTriangle size={13} strokeWidth={1.8} />
          {sub.status === "suspended" || sub.status === "past_due"
            ? "Paiement en attente — l'accès peut être restreint"
            : "Abonnement inactif — réactivez pour reprendre"}
        </div>
      )}

      {/* ── Primary CTA ── */}
      {isActive ? (
        <button
          onClick={onOpenApp}
          className="btn-gold w-full !py-2.5 !text-[13px]"
        >
          <span>Ouvrir l'app</span>
          <ExternalLink size={13} strokeWidth={2} />
        </button>
      ) : (
        <button
          onClick={() =>
            onPaymentModal(sub.status === "suspended" || sub.status === "past_due" ? "regularize" : "reactivate")
          }
          className="w-full py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-semibold hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
        >
          {sub.status === "suspended" || sub.status === "past_due"
            ? "Régulariser le paiement"
            : "Réactiver l'abonnement"}
        </button>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "amber" | "neutral";
}) {
  const toneClasses = {
    emerald: "text-emerald-700",
    amber:   "text-amber-700",
    neutral: "text-neutral-text",
  }[tone];
  const iconWrapperClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    neutral: "bg-neutral-100 text-neutral-500",
  }[tone];
  return (
    <div className="bg-white border border-warm-border rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconWrapperClasses}`}>
          <Icon size={12} strokeWidth={2} />
        </div>
        <span className="text-neutral-muted text-[10.5px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-lg font-bold ${toneClasses} leading-tight`}>{value}</div>
      {hint && (
        <p className="text-neutral-400 text-[10.5px] mt-0.5 leading-tight truncate">{hint}</p>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Receipt;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 flex items-center gap-2 text-neutral-body text-[12.5px] hover:bg-neutral-50 transition-colors"
    >
      <Icon size={13} strokeWidth={1.8} className="text-neutral-500" />
      {label}
    </button>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="mb-5 flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Rocket size={28} strokeWidth={1.5} />
        </div>
      </div>
      <h2 className="text-neutral-text text-2xl font-bold mb-2">
        Bienvenue sur Atlas Studio
      </h2>
      <p className="text-neutral-muted text-[14px] mb-8 leading-relaxed">
        Vous n'avez pas encore d'abonnement actif. Découvrez nos 14 applications
        SaaS pour piloter votre activité en zone OHADA.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={() => onNavigate("catalog")} className="btn-gold">
          Explorer le catalogue
        </button>
        <button
          onClick={() => onNavigate("activate")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13.5px] font-semibold hover:border-neutral-300 transition-colors"
        >
          <KeyRound size={14} strokeWidth={1.8} />
          J'ai une clé de licence
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatRelativeDays(days: number): string {
  if (days < 0) return "Expiré";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days < 30) return `${days} j`;
  const months = Math.round(days / 30);
  return `${months} mois`;
}

function formatFcfa(n: number): string {
  if (!n) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}
