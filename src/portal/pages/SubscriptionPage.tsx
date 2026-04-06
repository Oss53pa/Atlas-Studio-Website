import { useState } from "react";
import { Loader2, ArrowUpRight, XCircle } from "lucide-react";
import { useSubscription } from "../../hooks/useSubscription";
import { UsageBar } from "../../components/plans/UsageBar";
import { BillingCycleSwitcher } from "../../components/plans/BillingCycleSwitcher";
import { SUB_STATUS_LABELS } from "../../types/plans";

export function SubscriptionPage({ userId }: { userId?: string }) {
  const { subscription: sub, loading } = useSubscription(userId);
  const [cycle, setCycle] = useState(sub?.billing_cycle || "monthly");

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 size={28} style={{ color: "#EF9F27", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!sub) {
    return (
      <div style={{ background: "#FAFAF7", padding: 40, textAlign: "center" }}>
        <p style={{ color: "#888", fontSize: 15 }}>Aucun abonnement actif.</p>
      </div>
    );
  }

  const plan = sub.plans;
  const statusMeta = SUB_STATUS_LABELS[sub.status] || { label: sub.status, color: "#888" };
  const price =
    sub.billing_cycle === "annual" ? plan?.price_annual_fcfa : plan?.price_monthly_fcfa;

  return (
    <div style={{ background: "#FAFAF7", minHeight: "100vh", padding: "32px 24px" }}>
      <h1 style={{ color: "#1A1A1A", fontSize: 22, marginBottom: 24 }}>Mon abonnement</h1>

      {/* Plan card */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E8E0",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1A1A1A", fontSize: 20 }}>
              {plan?.display_name || plan?.name}
            </h2>
            <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0" }}>
              {sub.products?.name}
            </p>
          </div>
          <span
            style={{
              background: statusMeta.color + "18",
              color: statusMeta.color,
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 99,
            }}
          >
            {statusMeta.label}
          </span>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Prix</p>
            <p style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#1A1A1A", margin: "2px 0 0" }}>
              {price != null ? `${price.toLocaleString("fr-FR")} FCFA` : "Sur devis"}
            </p>
            <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
              /{sub.billing_cycle === "annual" ? "an" : "mois"}
            </p>
          </div>
          <div>
            <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Renouvellement</p>
            <p style={{ color: "#1A1A1A", fontSize: 15, fontWeight: 600, margin: "2px 0 0" }}>
              {sub.next_renewal_date
                ? new Date(sub.next_renewal_date).toLocaleDateString("fr-FR")
                : "N/A"}
            </p>
          </div>
          <div>
            <p style={{ color: "#888", fontSize: 12, margin: 0 }}>MRR</p>
            <p style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600, color: "#1A1A1A", margin: "2px 0 0" }}>
              {sub.mrr_fcfa.toLocaleString("fr-FR")} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E8E0",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3 style={{ color: "#1A1A1A", fontSize: 16, margin: "0 0 16px" }}>Utilisation</h3>
        <UsageBar used={sub.usage_api_calls} limit={plan?.api_calls_monthly || 0} unit="appels" label="Appels API" />
        <UsageBar used={sub.usage_storage_mb} limit={(plan?.storage_gb || 0) * 1024} unit="Mo" label="Stockage" />
        <UsageBar used={sub.usage_documents} limit={plan?.max_seats || 0} unit="sieges" label="Sieges" />
      </div>

      {/* Billing cycle */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E8E0",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#1A1A1A", fontSize: 14, fontWeight: 500 }}>
          Cycle de facturation
        </span>
        <BillingCycleSwitcher
          cycle={cycle}
          onChange={setCycle}
          annualDiscount={plan?.annual_discount_pct}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <a
          href="/portal/upgrade"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#EF9F27",
            color: "#FFF",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Upgrader <ArrowUpRight size={16} />
        </a>
        {!sub.cancel_at_period_end && (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              color: "#EF4444",
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #EF4444",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <XCircle size={16} /> Resilier
          </button>
        )}
      </div>
    </div>
  );
}
