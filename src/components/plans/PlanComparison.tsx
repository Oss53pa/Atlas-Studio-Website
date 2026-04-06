import { Check, X } from "lucide-react";
import { usePlanComparison } from "../../hooks/usePlanComparison";
import { BillingCycleSwitcher } from "./BillingCycleSwitcher";
import type { Plan, PlanFeature } from "../../types/plans";
import type { CSSProperties } from "react";

interface PlanComparisonProps {
  productId: string;
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  billingCycle: string;
  onCycleChange: (cycle: string) => void;
}

const badge = (bg: string): CSSProperties => ({
  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
  background: bg, color: "#FFF", fontSize: 11, fontWeight: 700, padding: "2px 12px", borderRadius: 99,
});
const catHead: CSSProperties = {
  color: "#888", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px",
};

function formatPrice(plan: Plan, cycle: string): string {
  const price = cycle === "annual" ? plan.price_annual_fcfa : plan.price_monthly_fcfa;
  return price == null ? "Sur devis" : price.toLocaleString("fr-FR") + " FCFA";
}

function featuresByCategory(plan: Plan) {
  const map: Record<string, PlanFeature[]> = {};
  for (const pf of plan.plan_features || []) (map[pf.features?.category || "General"] ??= []).push(pf);
  return map;
}

function allCategories(plans: Plan[]): string[] {
  const set = new Set<string>();
  for (const p of plans) for (const pf of p.plan_features || []) set.add(pf.features?.category || "General");
  return Array.from(set);
}

export function PlanComparison({ productId, currentPlanId, onSelectPlan, billingCycle, onCycleChange }: PlanComparisonProps) {
  const { plans, loading } = usePlanComparison(productId);
  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Chargement des plans...</div>;

  const categories = allCategories(plans);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <BillingCycleSwitcher cycle={billingCycle} onChange={onCycleChange} annualDiscount={plans[0]?.annual_discount_pct} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 20 }}>
        {plans.slice(0, 3).map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const catMap = featuresByCategory(plan);
          return (
            <div key={plan.id} style={{
              background: "#FFFFFF", border: isCurrent ? "2px solid #EF9F27" : "1px solid #E8E8E0",
              borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", position: "relative",
            }}>
              {isCurrent && <span style={badge("#EF9F27")}>Plan actuel</span>}
              {plan.is_popular && !isCurrent && <span style={badge("#1A1A1A")}>Populaire</span>}

              <h3 style={{ margin: "8px 0 4px", color: "#1A1A1A", fontSize: 18 }}>
                {plan.display_name || plan.name}
              </h3>
              {plan.description && <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>{plan.description}</p>}

              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, color: "#1A1A1A" }}>
                  {formatPrice(plan, billingCycle)}
                </span>
                {plan.price_monthly_fcfa != null && (
                  <span style={{ color: "#888", fontSize: 13 }}>/{billingCycle === "annual" ? "an" : "mois"}</span>
                )}
              </div>

              {categories.map((cat) => {
                const items = catMap[cat] || [];
                if (!items.length) return null;
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <p style={catHead}>{cat}</p>
                    {items.map((pf) => (
                      <div key={pf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: "#1A1A1A" }}>
                        {pf.enabled ? <Check size={14} style={{ color: "#22C55E" }} /> : <X size={14} style={{ color: "#CCC" }} />}
                        <span style={{ opacity: pf.enabled ? 1 : 0.5 }}>{pf.display_value || pf.features?.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <button onClick={() => onSelectPlan(plan.id)} disabled={isCurrent} style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 14,
                  cursor: isCurrent ? "default" : "pointer", background: isCurrent ? "#E8E8E0" : "#EF9F27",
                  color: isCurrent ? "#888" : "#FFFFFF", transition: "opacity 0.2s",
                }}>
                  {isCurrent ? "Plan actuel" : "Choisir"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
