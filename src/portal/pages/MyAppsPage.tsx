import { Rocket, AlertTriangle, Loader2 } from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { APP_INFO, STATUS_CONFIG } from "../../config/apps";
import { useSubscriptions } from "../../hooks/useSubscriptions";

interface MyAppsPageProps {
  userId: string | undefined;
  onOpenApp: (id: string) => void;
  onNavigate: (p: string) => void;
}

export function MyAppsPage({ userId, onOpenApp, onNavigate }: MyAppsPageProps) {
  const { subscriptions, loading } = useSubscriptions(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mb-4 flex justify-center">
          <Rocket size={64} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-neutral-text text-xl font-bold mb-2">Bienvenue sur Atlas Studio</h2>
        <p className="text-neutral-muted mb-6">Vous n'avez pas encore d'abonnement. Découvrez nos applications.</p>
        <button onClick={() => onNavigate("catalog")} className="btn-gold">
          Explorer le catalogue
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Mes Applications</h1>
      <p className="text-neutral-muted text-sm mb-7">Gérez vos abonnements et accédez à vos outils</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {subscriptions.map(sub => {
          const info = APP_INFO[sub.app_id];
          if (!info) return null;
          const statusConf = STATUS_CONFIG[sub.status] || STATUS_CONFIG.expired;
          const isActive = sub.status === "active" || sub.status === "trial";
          const daysRemaining = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000);

          return (
            <div key={sub.id} className="bg-white border border-warm-border rounded-2xl p-6 card-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <AppLogo name={info.name} size={22} color="text-gold" />
                  <div className="text-neutral-muted text-xs mt-1">
                    Plan {sub.plan?.charAt(0).toUpperCase() + sub.plan?.slice(1)}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-warm-border text-xs font-medium"
                  style={{ color: statusConf.color }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusConf.dotColor }} />
                  {statusConf.label}
                </div>
              </div>

              <div className="text-neutral-muted text-[13px] mb-5">
                {isActive ? (
                  <span>
                    {sub.status === 'trial' ? 'Essai gratuit — ' : ''}Expire dans{" "}
                    <strong className={daysRemaining <= 7 ? "text-amber-600" : "text-neutral-text"}>
                      {daysRemaining} jours
                    </strong>
                  </span>
                ) : sub.status === "suspended" ? (
                  <span className="text-amber-600 inline-flex items-center gap-1">
                    <AlertTriangle size={14} strokeWidth={1.5} /> Paiement en attente
                  </span>
                ) : (
                  <span className="text-red-500">Abonnement inactif</span>
                )}
              </div>

              {isActive ? (
                <button onClick={() => onOpenApp(sub.app_id)} className="btn-gold w-full !py-2.5 !text-[13px]">
                  Ouvrir l'app &rarr;
                </button>
              ) : (
                <button className="w-full py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-semibold hover:border-gold/40 transition-colors">
                  {sub.status === "suspended" ? "Régulariser le paiement" : "Réactiver"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
