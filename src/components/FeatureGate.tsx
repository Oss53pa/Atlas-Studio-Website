import { Lock, ArrowRight } from "lucide-react";
import { useFeatureAccess } from "../hooks/useFeatureAccess";

interface FeatureGateProps {
  feature: string;
  productId: string;
  tenantId?: string;
  children: React.ReactNode;
  fallback?: "hide" | "lock" | "upgrade";
}

export function FeatureGate({
  feature,
  productId,
  tenantId,
  children,
  fallback = "hide",
}: FeatureGateProps) {
  const { canAccess, loading } = useFeatureAccess(productId, tenantId);

  if (loading) return null;

  const access = canAccess(feature);

  if (access.allowed) return <>{children}</>;

  if (fallback === "hide") return null;

  if (fallback === "lock") {
    return (
      <div style={{ position: "relative" }}>
        <div
          style={{
            opacity: 0.35,
            pointerEvents: "none",
            filter: "grayscale(1)",
            userSelect: "none",
          }}
        >
          {children}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Lock size={24} style={{ color: "#888" }} />
            <span style={{ color: "#888", fontSize: 13 }}>
              Fonctionnalite verrouill&eacute;e
            </span>
          </div>
        </div>
      </div>
    );
  }

  // fallback === 'upgrade'
  return (
    <div
      style={{
        background: "#FFF8EB",
        border: "1px solid #EF9F27",
        borderRadius: 8,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "#1A1A1A",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Fonctionnalite non disponible
        </p>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>
          {access.message || "Passez a un plan superieur pour debloquer cette fonctionnalite."}
        </p>
      </div>
      <button
        style={{
          background: "#EF9F27",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 6,
          padding: "8px 18px",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        Upgrader <ArrowRight size={16} />
      </button>
    </div>
  );
}
