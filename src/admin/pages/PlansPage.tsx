import { useState, useEffect } from "react";
import {
  Package, Star, Users, TrendingUp, AlertTriangle, Clock, Crown, RefreshCw, DollarSign,
  Check, X, Building2, Sparkles
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { AdminCard } from "../components/AdminCard";

interface Plan {
  id: string;
  product_id: string;
  name: string;
  display_name?: string;
  description?: string;
  price_monthly: number;
  price_annual: number;
  price_monthly_fcfa?: number;
  price_annual_fcfa?: number;
  seats: number;
  max_seats?: number;
  max_companies?: number;
  is_popular: boolean;
  features: string[];
  created_at: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
}

// Feature map for a plan (fetched from plan_features + features join)
interface PlanFeatureRow {
  plan_id: string;
  enabled: boolean;
  features: {
    key: string;
    name: string;
    category: string | null;
    is_core: boolean;
    sort_order: number;
  };
}

interface Sub {
  id: string;
  plan: string;
  status: string;
  price_at_subscription: number;
  current_period_end: string;
  created_at: string;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function PlansPage() {
  const { error: showError } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubs] = useState<Sub[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [plansRes, prodsRes, subsRes, pfRes] = await Promise.all([
        supabase.from("plans").select("*").order("price_monthly_fcfa", { ascending: true, nullsFirst: false }),
        supabase.from("products").select("id, slug, name, icon, color").order("name"),
        supabase.from("subscriptions").select("id, plan, status, price_at_subscription, current_period_end, created_at"),
        supabase.from("plan_features").select("plan_id, enabled, features(key, name, category, is_core, sort_order)"),
      ]);
      if (plansRes.data) {
        // Normalize field names (some code reads price_monthly, DB uses price_monthly_fcfa)
        const normalized = (plansRes.data as any[]).map(p => ({
          ...p,
          price_monthly: p.price_monthly_fcfa ?? p.price_monthly ?? 0,
          price_annual: p.price_annual_fcfa ?? p.price_annual ?? 0,
          seats: p.max_seats ?? p.seats ?? 0,
        })) as Plan[];
        setPlans(normalized);
      }
      if (prodsRes.data) setProducts(prodsRes.data as Product[]);
      if (subsRes.data) setSubs(subsRes.data as Sub[]);
      if (pfRes.data) setPlanFeatures(pfRes.data as unknown as PlanFeatureRow[]);
      if (plansRes.error || prodsRes.error) showError("Erreur chargement");
      setLoading(false);
    };
    load();
  }, [showError]);

  // Build feature map per plan id
  const featuresByPlan = planFeatures.reduce((acc, pf) => {
    if (!pf.features) return acc;
    if (!acc[pf.plan_id]) acc[pf.plan_id] = [];
    acc[pf.plan_id].push(pf);
    return acc;
  }, {} as Record<string, PlanFeatureRow[]>);

  // Group plans by product
  const productMap = products.reduce((m, p) => { m[p.id] = p; return m; }, {} as Record<string, Product>);
  const grouped = plans.reduce((acc, p) => {
    const key = p.product_id || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, Plan[]>);

  // Subscription stats per plan
  const subsByPlan = subscriptions.reduce((acc, s) => {
    if (!acc[s.plan]) acc[s.plan] = { active: 0, total: 0 };
    acc[s.plan].total++;
    if (s.status === "active" || s.status === "trial") acc[s.plan].active++;
    return acc;
  }, {} as Record<string, { active: number; total: number }>);

  // MRR
  const mrr = subscriptions
    .filter(s => s.status === "active")
    .reduce((s, sub) => s + sub.price_at_subscription, 0);

  // Renewals
  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const dueForRenewal = subscriptions.filter(s => s.status === "active" && new Date(s.current_period_end) <= in30 && new Date(s.current_period_end) > now);
  const pastDue = subscriptions.filter(s => s.status === "active" && new Date(s.current_period_end) < now);
  const degraded = subscriptions.filter(s => s.status === "suspended" || s.status === "expired");

  const activeSubs = subscriptions.filter(s => s.status === "active").length;
  const trialSubs = subscriptions.filter(s => s.status === "trial").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#2A2A3A] rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Plans & Tarification</h1>
        <p className="text-[#888] text-sm mt-1">Gestion des plans, abonnements et renouvellements</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
        <AdminCard label="Abonnements actifs" value={activeSubs} sub={`+ ${trialSubs} essais`} icon={Users} />
        <AdminCard label="Renouvellements (30j)" value={dueForRenewal.length} icon={RefreshCw} />
        <AdminCard label="Plans configurés" value={plans.length} icon={Package} />
      </div>

      {/* Renewal dashboard */}
      {(pastDue.length > 0 || degraded.length > 0 || dueForRenewal.length > 0) && (
        <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
            <RefreshCw size={14} /> Tableau de renouvellement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-400 uppercase">A renouveler (30j)</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#F5F5F5]">{dueForRenewal.length}</div>
              <div className="text-[11px] text-[#888] mt-1">abonnements arrivent a echeance</div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-[12px] font-semibold text-red-400 uppercase">En retard</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#F5F5F5]">{pastDue.length}</div>
              <div className="text-[11px] text-[#888] mt-1">paiement en souffrance (past_due)</div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-orange-400" />
                <span className="text-[12px] font-semibold text-orange-400 uppercase">Dégradés</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#F5F5F5]">{degraded.length}</div>
              <div className="text-[11px] text-[#888] mt-1">suspendus ou expirés</div>
            </div>
          </div>
        </div>
      )}

      {/* Atlas F&A — Vue dediee Starter vs Premium cote a cote */}
      {(() => {
        const atlasFa = products.find(p => p.slug === "atlas-fa");
        if (!atlasFa) return null;
        const faPlans = plans
          .filter(p => p.product_id === atlasFa.id)
          .sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
        if (faPlans.length === 0) return null;

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{atlasFa.icon || "🧮"}</span>
              <h2 className="text-lg font-semibold text-[#F5F5F5]">{atlasFa.name}</h2>
              <span className="text-[11px] text-[#888] bg-[#2A2A3A] px-2 py-0.5 rounded-full">
                Comparaison des plans
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {faPlans.map(plan => {
                const stats = subsByPlan[plan.name] || { active: 0, total: 0 };
                const planFeats = (featuresByPlan[plan.id] || [])
                  .slice()
                  .sort((a, b) => (a.features?.sort_order || 0) - (b.features?.sort_order || 0));
                const included = planFeats.filter(pf => pf.enabled);
                const locked = planFeats.filter(pf => !pf.enabled);
                const isStarter = plan.name === "Starter";
                const isPremium = plan.name === "Premium";

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-[#1E1E2E] border rounded-xl p-6 transition-colors ${
                      plan.is_popular
                        ? "border-[#EF9F27]/60 shadow-[0_0_0_1px_rgba(239,159,39,0.15)]"
                        : "border-[#2A2A3A] hover:border-[#EF9F27]/30"
                    }`}
                  >
                    {/* Badge */}
                    {isStarter && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-[#EF9F27] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        <Star size={10} /> Populaire
                      </div>
                    )}
                    {isPremium && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-gradient-to-r from-[#EF9F27] to-[#f4b653] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        <Crown size={10} /> Groupes & Holdings
                      </div>
                    )}

                    {/* Titre */}
                    <div className="mb-4">
                      <h3 className="text-[17px] font-semibold text-[#F5F5F5]">
                        {plan.display_name || plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-[12px] text-[#888] mt-0.5">{plan.description}</p>
                      )}
                    </div>

                    {/* Prix */}
                    <div className="space-y-1 mb-4">
                      <div>
                        <span className="font-mono text-3xl font-bold text-[#EF9F27]">
                          {fmt(plan.price_monthly)}
                        </span>
                        <span className="text-[13px] text-[#888] ml-2">FCFA / mois</span>
                      </div>
                      {plan.price_annual > 0 && (
                        <div className="text-[12px] text-[#888]">
                          <span className="font-mono font-semibold text-[#F5F5F5]">
                            {fmt(plan.price_annual)}
                          </span>{" "}
                          FCFA / an
                        </div>
                      )}
                    </div>

                    {/* Limites structurelles */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                        <Building2 size={12} className="text-[#EF9F27]" />
                        <span className="text-[12px] text-[#F5F5F5]">
                          {(plan.max_companies ?? -1) === -1 ? "Sociétés illimitées" : `${plan.max_companies} société${plan.max_companies! > 1 ? "s" : ""}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                        <Users size={12} className="text-[#EF9F27]" />
                        <span className="text-[12px] text-[#F5F5F5]">
                          {(plan.max_seats ?? -1) === -1 ? "Utilisateurs illimités" : `${plan.max_seats} utilisateur${plan.max_seats! > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>

                    {/* Features incluses */}
                    {included.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={12} className="text-green-400" />
                          <span className="text-[11px] uppercase tracking-wider text-green-400 font-semibold">
                            Incluses ({included.length})
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {included.map((pf) => (
                            <li key={pf.features.key} className="flex items-start gap-2 text-[12px]">
                              <Check size={13} className="text-green-400 mt-0.5 shrink-0" />
                              <span className="text-[#F5F5F5]">{pf.features.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Features locked */}
                    {locked.length > 0 && (
                      <div className="border-t border-[#2A2A3A] pt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <X size={12} className="text-red-400/70" />
                          <span className="text-[11px] uppercase tracking-wider text-red-400/70 font-semibold">
                            Non disponibles ({locked.length})
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {locked.map((pf) => (
                            <li key={pf.features.key} className="flex items-start gap-2 text-[12px]">
                              <X size={13} className="text-red-400/50 mt-0.5 shrink-0" />
                              <span className="text-[#888] line-through decoration-[#444]">
                                {pf.features.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Stats abonnements */}
                    <div className="border-t border-[#2A2A3A] pt-3 mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-[#888] uppercase font-semibold mb-0.5">Actifs</div>
                        <div className="font-mono text-lg font-bold text-green-400">{stats.active}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#888] uppercase font-semibold mb-0.5">Total</div>
                        <div className="font-mono text-lg font-bold text-[#F5F5F5]">{stats.total}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* TableSmart — Vue dediee Starter / Pro / Enterprise cote a cote */}
      {(() => {
        const tableSmart = products.find(p => p.slug === "tablesmart");
        if (!tableSmart) return null;
        const tsPlans = plans
          .filter(p => p.product_id === tableSmart.id)
          .sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
        if (tsPlans.length === 0) return null;

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{tableSmart.icon || "🍽️"}</span>
              <h2 className="text-lg font-semibold text-[#F5F5F5]">{tableSmart.name}</h2>
              <span className="text-[11px] text-[#888] bg-[#2A2A3A] px-2 py-0.5 rounded-full">
                Comparaison des plans
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tsPlans.map(plan => {
                const stats = subsByPlan[plan.name] || { active: 0, total: 0 };
                const planFeats = (featuresByPlan[plan.id] || [])
                  .slice()
                  .sort((a, b) => (a.features?.sort_order || 0) - (b.features?.sort_order || 0));
                const included = planFeats.filter(pf => pf.enabled);
                const locked = planFeats.filter(pf => !pf.enabled);
                const isPro = plan.name === "Pro";
                const isEnterprise = plan.name === "Enterprise";

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-[#1E1E2E] border rounded-xl p-6 transition-colors ${
                      plan.is_popular
                        ? "border-[#EF9F27]/60 shadow-[0_0_0_1px_rgba(239,159,39,0.15)]"
                        : "border-[#2A2A3A] hover:border-[#EF9F27]/30"
                    }`}
                  >
                    {/* Badge */}
                    {isPro && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-[#EF9F27] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        <Star size={10} /> Populaire
                      </div>
                    )}
                    {isEnterprise && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-gradient-to-r from-[#EF9F27] to-[#f4b653] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        <Crown size={10} /> Groupes & Food courts
                      </div>
                    )}

                    {/* Titre */}
                    <div className="mb-4">
                      <h3 className="text-[17px] font-semibold text-[#F5F5F5]">
                        {plan.display_name || plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-[12px] text-[#888] mt-0.5">{plan.description}</p>
                      )}
                    </div>

                    {/* Prix */}
                    <div className="space-y-1 mb-4">
                      <div>
                        <span className="font-mono text-3xl font-bold text-[#EF9F27]">
                          {fmt(plan.price_monthly)}
                        </span>
                        <span className="text-[13px] text-[#888] ml-2">FCFA / mois</span>
                      </div>
                      {plan.price_annual > 0 && (
                        <div className="text-[12px] text-[#888]">
                          <span className="font-mono font-semibold text-[#F5F5F5]">
                            {fmt(plan.price_annual)}
                          </span>{" "}
                          FCFA / an
                        </div>
                      )}
                    </div>

                    {/* Limites structurelles */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                        <Building2 size={12} className="text-[#EF9F27]" />
                        <span className="text-[12px] text-[#F5F5F5]">
                          {(plan.max_companies ?? -1) === -1
                            ? "Établissements illimités"
                            : `${plan.max_companies} établissement${plan.max_companies! > 1 ? "s" : ""}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                        <Users size={12} className="text-[#EF9F27]" />
                        <span className="text-[12px] text-[#F5F5F5]">
                          {(plan.max_seats ?? -1) === -1
                            ? "Utilisateurs illimités"
                            : `${plan.max_seats} utilisateur${plan.max_seats! > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>

                    {/* Features incluses */}
                    {included.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={12} className="text-green-400" />
                          <span className="text-[11px] uppercase tracking-wider text-green-400 font-semibold">
                            Incluses ({included.length})
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {included.map((pf) => (
                            <li key={pf.features.key} className="flex items-start gap-2 text-[12px]">
                              <Check size={13} className="text-green-400 mt-0.5 shrink-0" />
                              <span className="text-[#F5F5F5]">{pf.features.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Features locked */}
                    {locked.length > 0 && (
                      <div className="border-t border-[#2A2A3A] pt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <X size={12} className="text-red-400/70" />
                          <span className="text-[11px] uppercase tracking-wider text-red-400/70 font-semibold">
                            Non disponibles ({locked.length})
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {locked.map((pf) => (
                            <li key={pf.features.key} className="flex items-start gap-2 text-[12px]">
                              <X size={13} className="text-red-400/50 mt-0.5 shrink-0" />
                              <span className="text-[#888] line-through decoration-[#444]">
                                {pf.features.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Stats abonnements */}
                    <div className="border-t border-[#2A2A3A] pt-3 mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-[#888] uppercase font-semibold mb-0.5">Actifs</div>
                        <div className="font-mono text-lg font-bold text-green-400">{stats.active}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#888] uppercase font-semibold mb-0.5">Total</div>
                        <div className="font-mono text-lg font-bold text-[#F5F5F5]">{stats.total}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Plans grouped by product (autres produits) */}
      {Object.entries(grouped).filter(([prodId]) => {
        const product = productMap[prodId];
        return product?.slug !== "atlas-fa" && product?.slug !== "tablesmart";
      }).map(([prodId, prodPlans]) => {
        const product = productMap[prodId];
        return (
          <div key={prodId} className="space-y-3">
            <div className="flex items-center gap-2">
              {product ? (
                <>
                  <span className="text-lg">{product.icon}</span>
                  <h2 className="text-lg font-semibold text-[#F5F5F5]">{product.name}</h2>
                </>
              ) : (
                <h2 className="text-lg font-semibold text-[#F5F5F5]">Autres plans</h2>
              )}
              <span className="text-[11px] text-[#888] bg-[#2A2A3A] px-2 py-0.5 rounded-full">{prodPlans.length} plan(s)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prodPlans.map(plan => {
                const stats = subsByPlan[plan.name] || { active: 0, total: 0 };
                return (
                  <div key={plan.id}
                    className={`relative bg-[#1E1E2E] border rounded-xl p-5 transition-colors hover:border-[#EF9F27]/30 ${plan.is_popular ? "border-[#EF9F27]/40" : "border-[#2A2A3A]"}`}>
                    {plan.is_popular && (
                      <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-[#EF9F27] text-[#0A0A0A] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                        <Star size={10} /> Populaire
                      </div>
                    )}

                    <div className="mb-3">
                      <h3 className="text-[15px] font-semibold text-[#F5F5F5]">{plan.name}</h3>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <span className="font-mono text-xl font-bold text-[#EF9F27]">{fmt(plan.price_monthly)}</span>
                        <span className="text-[12px] text-[#888] ml-1">FCFA / mois</span>
                      </div>
                      {plan.price_annual > 0 && (
                        <div className="text-[12px] text-[#888]">
                          <span className="font-mono font-semibold text-[#F5F5F5]">{fmt(plan.price_annual)}</span> FCFA / an
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3 text-[12px]">
                      <Users size={12} className="text-[#888]" />
                      <span className="text-[#F5F5F5]">{plan.seats === -1 ? "Illimité" : plan.seats} siège(s)</span>
                    </div>

                    <div className="border-t border-[#2A2A3A] pt-3 space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#888]">Abonnements actifs</span>
                        <span className="font-mono font-semibold text-green-400">{stats.active}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#888]">Total historique</span>
                        <span className="font-mono text-[#F5F5F5]">{stats.total}</span>
                      </div>
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <div className="border-t border-[#2A2A3A] pt-3 mt-3">
                        <div className="text-[11px] text-[#888] uppercase font-semibold mb-1">Fonctionnalités</div>
                        <ul className="space-y-0.5">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="text-[12px] text-[#F5F5F5] flex items-start gap-1.5">
                              <span className="text-[#EF9F27] mt-0.5">•</span> {f}
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-[11px] text-[#888]">+{plan.features.length - 4} autres</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* MRR summary */}
      <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
        <h3 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Crown size={14} className="text-[#EF9F27]" /> Résumé MRR
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
            <div className="text-[11px] text-[#888] uppercase font-semibold mb-1">MRR Total</div>
            <div className="font-mono text-2xl font-bold text-[#EF9F27]">{fmt(mrr)} <span className="text-[14px] text-[#888]">FCFA</span></div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
            <div className="text-[11px] text-[#888] uppercase font-semibold mb-1">ARR Estimé</div>
            <div className="font-mono text-2xl font-bold text-[#F5F5F5]">{fmt(mrr * 12)} <span className="text-[14px] text-[#888]">FCFA</span></div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg p-4">
            <div className="text-[11px] text-[#888] uppercase font-semibold mb-1">ARPU</div>
            <div className="font-mono text-2xl font-bold text-[#F5F5F5]">
              {activeSubs > 0 ? fmt(Math.round(mrr / activeSubs)) : "0"} <span className="text-[14px] text-[#888]">FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
