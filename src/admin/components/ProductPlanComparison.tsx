import { Star, Crown, Check, X, Building2, Users, Sparkles, type LucideIcon } from "lucide-react";

/**
 * ProductPlanComparison
 *
 * Bloc de comparaison de plans côte à côte, identique au rendu hardcodé
 * du bloc Atlas F&A dans PlansPage.tsx (lignes 196-350).
 *
 * Extrait pour réutilisation par LiassPilot, ADVIST et tout futur produit
 * qui suit la même structure (2-3 plans, features incluses/locked).
 *
 * Les blocs Atlas F&A et TableSmart EXISTANTS restent intacts pour éviter
 * toute régression — ce composant est uniquement utilisé par les nouveaux
 * blocs (LiassPilot, ADVIST).
 */

export interface PlanRow {
  id: string;
  product_id: string;
  name: string;
  display_name?: string;
  description?: string;
  price_monthly: number;
  price_annual: number;
  max_seats?: number;
  max_companies?: number;
  is_popular: boolean;
}

export interface PlanFeatureRow {
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

export interface PlanSubsStats {
  active: number;
  total: number;
}

interface ProductPlanComparisonProps {
  /** Nom du produit (header de la section) */
  productName: string;
  /** Icône emoji ou string courte affichée à côté du nom */
  productIcon?: string;
  /** Plans à afficher, déjà filtrés par produit et triés par prix croissant */
  plans: PlanRow[];
  /** Toutes les rangées plan_features (le composant filtre et trie en interne) */
  planFeatures: PlanFeatureRow[];
  /** Stats d'abonnements indexées par nom de plan */
  subsByPlan: Record<string, PlanSubsStats>;
  /** Libellé pour l'unité "société" — ex : "société", "établissement" */
  companyLabel?: string;
  /**
   * Optionnel : badge spécial à afficher sur le 2ᵉ plan (le plus haut de gamme)
   * — ex : "Cabinet illimité" pour LiassPilot, "Multi-équipes" pour ADVIST.
   * Si non fourni, seul le badge "Populaire" (sur le plan is_popular) est affiché.
   */
  premiumBadge?: { label: string; icon?: LucideIcon };
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

export function ProductPlanComparison({
  productName,
  productIcon,
  plans,
  planFeatures,
  subsByPlan,
  companyLabel = "société",
  premiumBadge,
}: ProductPlanComparisonProps) {
  if (plans.length === 0) return null;

  // Index features par plan, trié par sort_order
  const featuresByPlan = planFeatures.reduce((acc, pf) => {
    if (!pf.features) return acc;
    if (!acc[pf.plan_id]) acc[pf.plan_id] = [];
    acc[pf.plan_id].push(pf);
    return acc;
  }, {} as Record<string, PlanFeatureRow[]>);

  // Pluralisation simple
  const pluralizeCompany = (n: number) =>
    `${n} ${companyLabel}${n > 1 ? "s" : ""}`;

  // Le badge "premium" s'affiche sur le dernier plan (prix le plus élevé) si fourni
  const premiumPlanId = premiumBadge ? plans[plans.length - 1]?.id : null;
  const PremiumIcon = premiumBadge?.icon || Crown;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {productIcon && <span className="text-lg">{productIcon}</span>}
        <h2 className="text-lg font-semibold text-[#F5F5F5]">{productName}</h2>
        <span className="text-[11px] text-[#888] bg-[#2A2A3A] px-2 py-0.5 rounded-full">
          Comparaison des plans
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const stats = subsByPlan[plan.name] || { active: 0, total: 0 };
          const planFeats = (featuresByPlan[plan.id] || [])
            .slice()
            .sort((a, b) => (a.features?.sort_order || 0) - (b.features?.sort_order || 0));
          const included = planFeats.filter((pf) => pf.enabled);
          const locked = planFeats.filter((pf) => !pf.enabled);
          const isPremium = premiumPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-[#1E1E2E] border rounded-xl p-6 transition-colors ${
                plan.is_popular
                  ? "border-[#EF9F27]/60 shadow-[0_0_0_1px_rgba(239,159,39,0.15)]"
                  : "border-[#2A2A3A] hover:border-[#EF9F27]/30"
              }`}
            >
              {/* Badges */}
              {plan.is_popular && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-[#EF9F27] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                  <Star size={10} /> Populaire
                </div>
              )}
              {isPremium && !plan.is_popular && premiumBadge && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-gradient-to-r from-[#EF9F27] to-[#f4b653] text-[#0A0A0A] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                  <PremiumIcon size={10} /> {premiumBadge.label}
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
                {plan.max_companies !== undefined && (
                  <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                    <Building2 size={12} className="text-[#EF9F27]" />
                    <span className="text-[12px] text-[#F5F5F5]">
                      {(plan.max_companies ?? -1) === -1
                        ? `${companyLabel.charAt(0).toUpperCase()}${companyLabel.slice(1)}s illimitées`
                        : pluralizeCompany(plan.max_companies)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-2.5 py-1">
                  <Users size={12} className="text-[#EF9F27]" />
                  <span className="text-[12px] text-[#F5F5F5]">
                    {(plan.max_seats ?? -1) === -1
                      ? "Utilisateurs illimités"
                      : `${plan.max_seats} utilisateur${(plan.max_seats ?? 0) > 1 ? "s" : ""}`}
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
}
