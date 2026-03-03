import { CreditCard, Smartphone } from "lucide-react";

interface PaymentMethodSelectorProps {
  selected: string;
  onChange: (method: string) => void;
}

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    { id: "stripe", label: "Carte bancaire", icon: CreditCard, desc: "Visa, Mastercard" },
    { id: "cinetpay", label: "Mobile Money", icon: Smartphone, desc: "Orange, MTN, Wave" },
  ];

  return (
    <div className="space-y-2">
      <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Moyen de paiement</div>
      <div className="flex gap-3">
        {methods.map(m => (
          <div
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`flex-1 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
              selected === m.id
                ? "border-gold bg-gold/5"
                : "border-warm-border hover:border-gold/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <m.icon size={18} strokeWidth={1.5} className={selected === m.id ? "text-gold" : "text-neutral-muted"} />
              <span className={`text-sm font-semibold ${selected === m.id ? "text-gold" : "text-neutral-text"}`}>
                {m.label}
              </span>
            </div>
            <div className="text-neutral-placeholder text-[11px]">{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
