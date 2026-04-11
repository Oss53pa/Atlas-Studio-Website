import { Check, X } from "lucide-react";
import { checkPassword, passwordScore } from "./signupHelpers";

interface PasswordStrengthProps {
  password: string;
}

const LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Fort", "Excellent"];
const COLORS = [
  "bg-red-500",
  "bg-red-500",
  "bg-amber-500",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-emerald-500",
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;
  const check = checkPassword(password);
  const score = passwordScore(check);
  const pct = (score / 5) * 100;

  const rules: { key: keyof typeof check; label: string }[] = [
    { key: "length", label: "12 caractères minimum" },
    { key: "upper",  label: "Une majuscule (A-Z)" },
    { key: "lower",  label: "Une minuscule (a-z)" },
    { key: "digit",  label: "Un chiffre (0-9)" },
    { key: "symbol", label: "Un symbole (!@#…)" },
  ];

  return (
    <div className="mt-2 mb-2">
      {/* Barre de progression */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${COLORS[score]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[11px] font-semibold ${
          score >= 5 ? "text-emerald-400" :
          score >= 3 ? "text-amber-400" :
          "text-red-400"
        }`}>
          {LABELS[score]}
        </span>
      </div>

      {/* Checklist des règles */}
      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rules.map(({ key, label }) => {
          const ok = check[key];
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                ok ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
