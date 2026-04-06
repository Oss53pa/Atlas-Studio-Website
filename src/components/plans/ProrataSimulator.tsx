import type { ProrataResult } from "../../types/plans";

interface ProrataSimulatorProps {
  prorata: ProrataResult | null;
  currentPlanName: string;
  newPlanName: string;
}

function FcfaAmount({ value, color }: { value: number; color?: string }) {
  return (
    <span style={{ fontFamily: "monospace", fontWeight: 600, color }}>
      {value.toLocaleString("fr-FR")} FCFA
    </span>
  );
}

export function ProrataSimulator({
  prorata,
  currentPlanName,
  newPlanName,
}: ProrataSimulatorProps) {
  if (!prorata) return null;

  const rows: { label: string; value: number; color: string }[] = [
    {
      label: `Credit restant (${currentPlanName})`,
      value: prorata.credit_fcfa,
      color: "#22C55E",
    },
    {
      label: `Nouveau montant (${newPlanName})`,
      value: prorata.charge_fcfa,
      color: "#EF9F27",
    },
  ];

  const netColor = prorata.net_fcfa > 0 ? "#EF9F27" : "#22C55E";

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E8E0",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <h4 style={{ margin: "0 0 12px", color: "#1A1A1A", fontSize: 15 }}>
        Simulation du prorata
      </h4>

      <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>
        {prorata.days_remaining} jour{prorata.days_remaining > 1 ? "s" : ""}{" "}
        restant{prorata.days_remaining > 1 ? "s" : ""} sur la periode en cours
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #E8E8E0",
            }}
          >
            <span style={{ color: "#1A1A1A", fontSize: 14 }}>{r.label}</span>
            <FcfaAmount value={r.value} color={r.color} />
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0 0",
          }}
        >
          <span style={{ color: "#1A1A1A", fontSize: 15, fontWeight: 700 }}>
            {prorata.net_fcfa > 0 ? "A payer" : "Avoir"}
          </span>
          <FcfaAmount
            value={Math.abs(prorata.net_fcfa)}
            color={netColor}
          />
        </div>
      </div>
    </div>
  );
}
