import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PartyPopper, Loader2, Package, CheckCircle2 } from "lucide-react";
import { AppLogo } from "../../components/ui/Logo";
import { PaymentMethodSelector } from "../../components/ui/PaymentMethodSelector";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { useBundles, type Bundle } from "../../hooks/useBundles";
import { createCheckoutSession, createBundleCheckoutSession } from "../../lib/payments";
import { planEntries, seatBounds, computeSeatPrice, type SeatPlanConfig } from "../../lib/utils";
import type { AppRow } from "../../lib/database.types";

interface CatalogPageProps {
  userId: string | undefined;
}

export function CatalogPage({ userId }: CatalogPageProps) {
  const { subscriptions, loading: subsLoading } = useSubscriptions(userId);
  const { appList, loading: appsLoading } = useAppCatalog();
  const { bundles } = useBundles();
  const [searchParams] = useSearchParams();
  const [selectedApp, setSelectedApp] = useState<AppRow | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [subscribing, setSubscribing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [seats, setSeats] = useState(1);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [bundlePayment, setBundlePayment] = useState("stripe");
  const [bundleSubscribing, setBundleSubscribing] = useState(false);

  // Ouvre automatiquement la suite passée en lien profond (?bundle=slug).
  useEffect(() => {
    const slug = searchParams.get("bundle");
    if (slug && bundles.length > 0 && !selectedBundle) {
      const b = bundles.find(x => x.slug === slug);
      if (b) setSelectedBundle(b);
    }
  }, [searchParams, bundles, selectedBundle]);

  const handleBundleSubscribe = async () => {
    if (!selectedBundle) return;
    setBundleSubscribing(true);
    try {
      await createBundleCheckoutSession(selectedBundle.slug, bundlePayment);
    } catch (err: any) {
      setToast(`Erreur: ${err.message}`);
      setBundleSubscribing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const seatConfigFor = (app: AppRow | null, plan: string | null): SeatPlanConfig | undefined => {
    if (!app || !plan) return undefined;
    return ((app as any).seat_pricing as Record<string, SeatPlanConfig> | undefined)?.[plan];
  };
  const selectPlan = (app: AppRow, plan: string) => {
    setSelectedPlan(plan);
    const b = seatBounds(seatConfigFor(app, plan));
    setSeats(b ? b.def : 1);
  };

  const loading = subsLoading || appsLoading;
  const subscribedIds = subscriptions.map(s => s.app_id);
  const availableApps = appList.filter(
    a => !subscribedIds.includes(a.id) && a.status === "available" && (a as any).visible !== false
  );

  const handleSubscribe = async () => {
    if (!selectedApp || !selectedPlan) return;
    setSubscribing(true);
    try {
      await createCheckoutSession(selectedApp.id, selectedPlan, seats, paymentMethod, promoCode || undefined);
    } catch (err: any) {
      setToast(`Erreur: ${err.message}`);
      setSubscribing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const formatPrice = (price: number) => price.toLocaleString("fr-FR");
  const getCurrency = (app: AppRow) => (app as any).currency || "FCFA";

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
          onClick={() => { setSelectedApp(null); setSelectedPlan(null); setSeats(1); }}
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
              {planEntries(selectedApp.pricing as Record<string, number>).map(([planName, price]) => (
                <div
                  key={planName}
                  onClick={() => selectPlan(selectedApp, planName)}
                  className={`flex-1 p-4 rounded-xl cursor-pointer text-center border transition-all duration-200 ${
                    selectedPlan === planName
                      ? "border-gold bg-gold/5"
                      : "border-warm-border hover:border-gold/30"
                  }`}
                >
                  <div className="text-neutral-muted text-xs font-medium">{planName}</div>
                  <div className="text-gold text-2xl font-extrabold my-1">{formatPrice(price)}</div>
                  <div className="text-neutral-placeholder text-[11px]">{getCurrency(selectedApp)}/{selectedApp.pricing_period || "mois"}</div>
                  {(selectedApp as any).pricing_notes?.[planName] && (
                    <div className="text-neutral-placeholder text-[10px] mt-1 leading-tight">{(selectedApp as any).pricing_notes[planName]}</div>
                  )}
                </div>
              ))}
            </div>

            {selectedPlan && (() => {
              const cfg = seatConfigFor(selectedApp, selectedPlan);
              const bounds = seatBounds(cfg);
              const base = (selectedApp.pricing as Record<string, number>)[selectedPlan] || 0;
              const total = computeSeatPrice(base, cfg, seats);
              return (
              <>
                {bounds && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-neutral-muted uppercase tracking-wider mb-1.5">
                      {cfg?.mode === "per_person" ? "Nombre d'utilisateurs" : "Nombre de sièges"}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSeats(s => Math.max(bounds.min, s - 1))}
                        className="w-9 h-9 rounded-lg border border-warm-border text-lg font-bold text-neutral-body hover:border-gold/40 disabled:opacity-40"
                        disabled={seats <= bounds.min}
                      >−</button>
                      <span className="w-12 text-center text-lg font-bold text-neutral-text">{seats}</span>
                      <button
                        type="button"
                        onClick={() => setSeats(s => Math.min(bounds.max, s + 1))}
                        className="w-9 h-9 rounded-lg border border-warm-border text-lg font-bold text-neutral-body hover:border-gold/40 disabled:opacity-40"
                        disabled={seats >= bounds.max}
                      >+</button>
                      {cfg?.mode === "forfait_seats" && (cfg.included ?? 0) > 0 && (
                        <span className="text-neutral-placeholder text-[11px]">
                          {cfg.included} inclus · +{formatPrice(cfg.extra ?? 0)} {getCurrency(selectedApp)}/siège
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="mb-4 flex items-baseline justify-between px-1">
                  <span className="text-neutral-muted text-xs font-semibold uppercase tracking-wider">Total</span>
                  <span className="text-gold text-xl font-extrabold">
                    {formatPrice(total)} {getCurrency(selectedApp)}<span className="text-neutral-placeholder text-[11px] font-medium">/{selectedApp.pricing_period || "mois"}</span>
                  </span>
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-neutral-muted uppercase tracking-wider mb-1.5">Code promo (optionnel)</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="ATLAS2026"
                    className="w-full px-3 py-2 bg-white border border-warm-border rounded-lg text-sm font-mono tracking-wider uppercase focus:border-gold outline-none"
                  />
                </div>
                <div className="mb-6">
                  <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
                </div>
              </>
              );
            })()}

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

      {selectedBundle && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setSelectedBundle(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 max-w-lg w-full border border-warm-border max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <Package size={22} className="text-gold" strokeWidth={2} />
              <h2 className="text-neutral-text text-xl font-bold">{selectedBundle.name}</h2>
            </div>
            {selectedBundle.tagline && <p className="text-neutral-muted text-[13px] mb-5">{selectedBundle.tagline}</p>}

            <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-3">Applications incluses</div>
            <div className="mb-5 space-y-2">
              {selectedBundle.included.map((inc, i) => (
                <div key={i} className="flex items-center gap-2 text-neutral-body text-[13px]">
                  <CheckCircle2 size={15} className="text-gold flex-shrink-0" strokeWidth={2} />
                  <span className="font-medium">{inc.app}</span>
                  <span className="text-neutral-muted text-[12px]">· {inc.plan}</span>
                </div>
              ))}
            </div>

            <div className="mb-5 flex items-baseline justify-between px-1">
              <span className="text-neutral-muted text-xs font-semibold uppercase tracking-wider">Total suite</span>
              <span className="text-right">
                <span className="text-gold text-xl font-extrabold">{formatPrice(selectedBundle.price_monthly_fcfa)} FCFA<span className="text-neutral-placeholder text-[11px] font-medium">/mois</span></span>
                <span className="block text-neutral-placeholder text-[11px]">
                  <span className="line-through">{formatPrice(selectedBundle.sum_monthly_fcfa)}</span>
                  <span className="text-gold ml-1.5">−{formatPrice(selectedBundle.savings_monthly_fcfa)}/mois</span>
                </span>
              </span>
            </div>

            <div className="mb-6">
              <PaymentMethodSelector selected={bundlePayment} onChange={setBundlePayment} />
            </div>

            <button
              disabled={bundleSubscribing}
              onClick={handleBundleSubscribe}
              className={`btn-gold w-full ${bundleSubscribing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {bundleSubscribing ? "Redirection..." : "Procéder au paiement"}
            </button>
          </div>
        </div>
      )}

      {bundles.length > 0 && (
        <div className="mb-10">
          <h2 className="text-neutral-text text-lg font-bold mb-1 flex items-center gap-2"><Package size={18} className="text-gold" /> Suites — économisez −20 %</h2>
          <p className="text-neutral-muted text-[13px] mb-4">Regroupez plusieurs applications en un seul abonnement.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bundles.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBundle(b)}
                className={`bg-white border rounded-2xl p-6 cursor-pointer card-hover ${b.is_popular ? "border-gold/40" : "border-warm-border"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} className="text-gold" />
                  <span className="text-neutral-text font-bold text-sm">{b.name}</span>
                </div>
                <p className="text-neutral-muted text-[12px] mb-3 leading-snug">{b.tagline}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {b.included.map((inc, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{inc.app}</span>
                  ))}
                </div>
                <div className="text-gold text-sm font-semibold">
                  {formatPrice(b.price_monthly_fcfa)} FCFA/mois <span className="text-neutral-placeholder text-[11px] line-through ml-1">{formatPrice(b.sum_monthly_fcfa)}</span> &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {availableApps.map(app => {
          const prices = planEntries(app.pricing as Record<string, number>).map(([, v]) => v);
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
                A partir de {formatPrice(minPrice)} {getCurrency(app)}/{app.pricing_period || "mois"} &rarr;
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
