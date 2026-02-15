import { useState } from "react";
import { PartyPopper, Loader2 } from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { APP_INFO } from "../../config/apps";
import { useSubscriptions } from "../../hooks/useSubscriptions";

interface CatalogPageProps {
  userId: string | undefined;
}

export function CatalogPage({ userId }: CatalogPageProps) {
  const { subscriptions, subscribe, loading } = useSubscriptions(userId);
  const [selectedApp, setSelectedApp] = useState<(typeof APP_INFO)[string] & { id: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const subscribedIds = subscriptions.map(s => s.app_id);
  const allApps = Object.entries(APP_INFO).filter(([id]) => !subscribedIds.includes(id));

  const handleSubscribe = async () => {
    if (!selectedApp || !selectedPlan) return;
    setSubscribing(true);
    const price = selectedApp.pricing[selectedPlan]?.price || 0;
    const { error } = await subscribe(selectedApp.id, selectedPlan, price);
    setSubscribing(false);
    if (error) {
      setToast(`Erreur: ${error}`);
    } else {
      setToast(`Abonnement à ${selectedApp.name} créé avec succès !`);
      setSelectedApp(null);
      setSelectedPlan(null);
    }
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Catalogue</h1>
      <p className="text-neutral-muted text-sm mb-7">Découvrez nos solutions professionnelles</p>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium">
          {toast}
        </div>
      )}

      {selectedApp && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => { setSelectedApp(null); setSelectedPlan(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 max-w-lg w-full border border-warm-border max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="mb-5">
              <h2 className="mb-1"><AppLogo name={selectedApp.name} size={28} color="text-gold" /></h2>
              <p className="text-neutral-muted text-[13px]">{selectedApp.tagline}</p>
            </div>
            <p className="text-neutral-body text-sm leading-relaxed mb-5">{selectedApp.description}</p>

            <div className="mb-6">
              <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-3">Fonctionnalités</div>
              {selectedApp.features.map((f, i) => (
                <div key={i} className="text-neutral-body text-[13px] py-1.5 flex items-center gap-2">
                  <span className="text-gold font-bold">&#x2713;</span> {f}
                </div>
              ))}
            </div>

            <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-3">Choisir un plan</div>
            <div className="flex gap-3 mb-6">
              {Object.entries(selectedApp.pricing).map(([key, plan]) => (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`flex-1 p-4 rounded-xl cursor-pointer text-center border transition-all duration-200 ${
                    selectedPlan === key
                      ? "border-gold bg-gold/5"
                      : "border-warm-border hover:border-gold/30"
                  }`}
                >
                  <div className="text-neutral-muted text-xs font-medium">{plan.label}</div>
                  <div className="text-gold text-2xl font-extrabold my-1">{plan.price}</div>
                  <div className="text-neutral-placeholder text-[11px]">/mois</div>
                </div>
              ))}
            </div>

            <button
              disabled={!selectedPlan || subscribing}
              onClick={handleSubscribe}
              className={`btn-gold w-full ${!selectedPlan || subscribing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {subscribing ? "Création..." : selectedPlan ? "Démarrer l'essai gratuit (14 jours)" : "Sélectionnez un plan"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allApps.map(([id, info]) => (
          <div
            key={id}
            onClick={() => setSelectedApp({ ...info, id })}
            className="bg-white border border-warm-border rounded-2xl p-6 cursor-pointer card-hover"
          >
            <div className="mb-3">
              <AppLogo name={info.name} size={22} color="text-gold" />
            </div>
            <p className="text-neutral-muted text-[13px] mb-4">{info.tagline}</p>
            <div className="text-gold text-sm font-semibold">
              À partir de {Math.min(...Object.values(info.pricing).map(p => p.price))}/mois &rarr;
            </div>
          </div>
        ))}
      </div>

      {allApps.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-3 flex justify-center"><PartyPopper size={48} className="text-gold" strokeWidth={1.5} /></div>
          <p className="text-neutral-muted">Vous êtes abonné à toutes nos applications !</p>
        </div>
      )}
    </div>
  );
}
