import { useState } from "react";
import { PartyPopper, Loader2 } from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { PaymentMethodSelector } from "../../components/ui/PaymentMethodSelector";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { createCheckoutSession } from "../../lib/payments";
import type { AppRow } from "../../lib/database.types";

interface CatalogPageProps {
  userId: string | undefined;
}

export function CatalogPage({ userId }: CatalogPageProps) {
  const { subscriptions, loading: subsLoading } = useSubscriptions(userId);
  const { appList, loading: appsLoading } = useAppCatalog();
  const [selectedApp, setSelectedApp] = useState<AppRow | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [subscribing, setSubscribing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loading = subsLoading || appsLoading;
  const subscribedIds = subscriptions.map(s => s.app_id);
  const availableApps = appList.filter(
    a => !subscribedIds.includes(a.id) && a.status === "available"
  );

  const handleSubscribe = async () => {
    if (!selectedApp || !selectedPlan) return;
    setSubscribing(true);
    try {
      const pricing = selectedApp.pricing as Record<string, number>;
      const price = pricing[selectedPlan] || 0;
      await createCheckoutSession(selectedApp.id, selectedPlan, price, paymentMethod);
    } catch (err: any) {
      setToast(`Erreur: ${err.message}`);
      setSubscribing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const formatPrice = (price: number) => price.toLocaleString("fr-FR");

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
              {Object.entries(selectedApp.pricing as Record<string, number>).map(([planName, price]) => (
                <div
                  key={planName}
                  onClick={() => setSelectedPlan(planName)}
                  className={`flex-1 p-4 rounded-xl cursor-pointer text-center border transition-all duration-200 ${
                    selectedPlan === planName
                      ? "border-gold bg-gold/5"
                      : "border-warm-border hover:border-gold/30"
                  }`}
                >
                  <div className="text-neutral-muted text-xs font-medium">{planName}</div>
                  <div className="text-gold text-2xl font-extrabold my-1">{formatPrice(price)}</div>
                  <div className="text-neutral-placeholder text-[11px]">FCFA/{selectedApp.pricing_period || "mois"}</div>
                </div>
              ))}
            </div>

            {selectedPlan && (
              <div className="mb-6">
                <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
              </div>
            )}

            <button
              disabled={!selectedPlan || subscribing}
              onClick={handleSubscribe}
              className={`btn-gold w-full ${!selectedPlan || subscribing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {subscribing ? "Redirection..." : selectedPlan ? "Procéder au paiement" : "Sélectionnez un plan"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {availableApps.map(app => {
          const prices = Object.values(app.pricing as Record<string, number>);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          return (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white border border-warm-border rounded-2xl p-6 cursor-pointer card-hover"
            >
              <div className="mb-3">
                <AppLogo name={app.name} size={22} color="text-gold" />
              </div>
              <p className="text-neutral-muted text-[13px] mb-4">{app.tagline}</p>
              <div className="text-gold text-sm font-semibold">
                À partir de {formatPrice(minPrice)} FCFA/{app.pricing_period || "mois"} &rarr;
              </div>
            </div>
          );
        })}
      </div>

      {availableApps.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-3 flex justify-center"><PartyPopper size={48} className="text-gold" strokeWidth={1.5} /></div>
          <p className="text-neutral-muted">Vous êtes abonné à toutes nos applications !</p>
        </div>
      )}
    </div>
  );
}
