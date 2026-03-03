import { useState } from "react";
import { Rocket, AlertTriangle, Loader2 } from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { PaymentMethodSelector } from "../../components/ui/PaymentMethodSelector";
import { APP_INFO, STATUS_CONFIG } from "../../config/apps";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { createRegularizationSession, createReactivationSession } from "../../lib/payments";

interface MyAppsPageProps {
  userId: string | undefined;
  onOpenApp: (id: string) => void;
  onNavigate: (p: string) => void;
}

export function MyAppsPage({ userId, onOpenApp, onNavigate }: MyAppsPageProps) {
  const { subscriptions, loading } = useSubscriptions(userId);
  const [paymentModal, setPaymentModal] = useState<{ subId: string; type: "regularize" | "reactivate" } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [processing, setProcessing] = useState(false);

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

      {/* Payment method modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5" onClick={() => setPaymentModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-8 max-w-md w-full border border-warm-border shadow-2xl">
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
                <button
                  onClick={() => setPaymentModal({
                    subId: sub.id,
                    type: sub.status === "suspended" ? "regularize" : "reactivate",
                  })}
                  className="w-full py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-semibold hover:border-gold/40 transition-colors"
                >
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
