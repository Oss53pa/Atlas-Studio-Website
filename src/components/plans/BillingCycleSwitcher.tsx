interface BillingCycleSwitcherProps {
  cycle: string;
  onChange: (c: string) => void;
  annualDiscount?: number;
}

export function BillingCycleSwitcher({
  cycle,
  onChange,
  annualDiscount,
}: BillingCycleSwitcherProps) {
  const isAnnual = cycle === "annual";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 8px",
        background: "#FFFFFF",
        borderRadius: 8,
        border: "1px solid #E8E8E0",
      }}
    >
      <button
        onClick={() => onChange("monthly")}
        style={{
          padding: "6px 16px",
          borderRadius: 6,
          border: "none",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          background: !isAnnual ? "#EF9F27" : "transparent",
          color: !isAnnual ? "#FFFFFF" : "#888",
          transition: "all 0.2s",
        }}
      >
        Mensuel
      </button>
      <button
        onClick={() => onChange("annual")}
        style={{
          padding: "6px 16px",
          borderRadius: 6,
          border: "none",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          background: isAnnual ? "#EF9F27" : "transparent",
          color: isAnnual ? "#FFFFFF" : "#888",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Annuel
        {annualDiscount != null && annualDiscount > 0 && (
          <span
            style={{
              background: "#FFF8EB",
              color: "#EF9F27",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
            }}
          >
            -{annualDiscount}%
          </span>
        )}
      </button>
    </div>
  );
}
