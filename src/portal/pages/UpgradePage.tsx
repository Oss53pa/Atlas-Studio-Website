import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSubscription } from "../../hooks/useSubscription";
import { PlanComparison } from "../../components/plans/PlanComparison";
import { ProrataSimulator } from "../../components/plans/ProrataSimulator";
import { usePlanComparison } from "../../hooks/usePlanComparison";
import type { ProrataResult } from "../../types/plans";
import { supabase } from "../../lib/supabase";

export function UpgradePage({ userId }: { userId?: string }) {
  const { subscription: sub, loading: subLoading, calculateProrata } =
    useSubscription(userId);
  const productId = sub?.product_id || "";
  const { plans } = usePlanComparison(productId);

  const [billingCycle, setBillingCycle] = useState(
    sub?.billing_cycle || "monthly"
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [prorata, setProrata] = useState<ProrataResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sub?.billing_cycle) setBillingCycle(sub.billing_cycle);
  }, [sub?.billing_cycle]);

  useEffect(() => {
    if (!selectedPlanId || !sub) {
      setProrata(null);
      return;
    }
    calculateProrata(selectedPlanId, billingCycle).then(setProrata);
  }, [selectedPlanId, billingCycle, sub, calculateProrata]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const currentPlanName =
    sub?.plans?.display_name || sub?.plans?.name || "Actuel";
  const newPlanName =
    selectedPlan?.display_name || selectedPlan?.name || "Nouveau";

  const handleConfirm = async () => {
    if (!selectedPlanId || !sub) return;
    setConfirming(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            subscription_id: sub.id,
            new_plan_id: selectedPlanId,
            new_cycle: billingCycle,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Erreur lors du changement de plan");
      }
      window.location.href = "/portal/subscription";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  if (subLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2
          size={28}
          style={{ color: "#EF9F27", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FAFAF7",
        minHeight: "100vh",
        padding: "32px 24px",
      }}
    >
      <h1 style={{ color: "#1A1A1A", fontSize: 22, marginBottom: 8 }}>
        Changer de plan
      </h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 28 }}>
        Comparez les plans et selectionnez celui qui vous convient.
      </p>

      <PlanComparison
        productId={productId}
        currentPlanId={sub?.plan_id}
        onSelectPlan={setSelectedPlanId}
        billingCycle={billingCycle}
        onCycleChange={setBillingCycle}
      />

      {selectedPlanId && (
        <div style={{ marginTop: 28, maxWidth: 480 }}>
          <ProrataSimulator
            prorata={prorata}
            currentPlanName={currentPlanName}
            newPlanName={newPlanName}
          />

          {error && (
            <p style={{ color: "#EF4444", fontSize: 13, marginTop: 12 }}>
              {error}
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              fontSize: 15,
              cursor: confirming ? "wait" : "pointer",
              background: "#EF9F27",
              color: "#FFFFFF",
              opacity: confirming ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {confirming ? "Traitement..." : "Confirmer le changement"}
          </button>
        </div>
      )}
    </div>
  );
}
