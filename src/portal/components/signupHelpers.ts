// ══════════════════════════════════════════════════════════
// Helpers du formulaire d'inscription client Atlas Studio
// ══════════════════════════════════════════════════════════

// Liste OHADA 17 pays + 3 pays frequents hors OHADA, code ISO alpha-2 + dial code
export const COUNTRIES: { code: string; name: string; dial: string; flag: string }[] = [
  // OHADA
  { code: "CI", name: "Côte d'Ivoire",                dial: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal",                      dial: "+221", flag: "🇸🇳" },
  { code: "CM", name: "Cameroun",                     dial: "+237", flag: "🇨🇲" },
  { code: "BF", name: "Burkina Faso",                 dial: "+226", flag: "🇧🇫" },
  { code: "ML", name: "Mali",                         dial: "+223", flag: "🇲🇱" },
  { code: "TG", name: "Togo",                         dial: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin",                        dial: "+229", flag: "🇧🇯" },
  { code: "NE", name: "Niger",                        dial: "+227", flag: "🇳🇪" },
  { code: "GA", name: "Gabon",                        dial: "+241", flag: "🇬🇦" },
  { code: "CG", name: "Congo",                        dial: "+242", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo",                     dial: "+243", flag: "🇨🇩" },
  { code: "TD", name: "Tchad",                        dial: "+235", flag: "🇹🇩" },
  { code: "CF", name: "Centrafrique",                 dial: "+236", flag: "🇨🇫" },
  { code: "GQ", name: "Guinée équatoriale",           dial: "+240", flag: "🇬🇶" },
  { code: "GN", name: "Guinée",                       dial: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinée-Bissau",                dial: "+245", flag: "🇬🇼" },
  { code: "KM", name: "Comores",                      dial: "+269", flag: "🇰🇲" },
  // Pays fréquents hors OHADA
  { code: "MA", name: "Maroc",                        dial: "+212", flag: "🇲🇦" },
  { code: "FR", name: "France",                       dial: "+33",  flag: "🇫🇷" },
  { code: "BE", name: "Belgique",                     dial: "+32",  flag: "🇧🇪" },
];

// ── Email validation (format RFC 5322 simplifié) ──
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validateEmail(email: string): string | null {
  if (!email) return "Email requis";
  if (!EMAIL_RE.test(email.trim())) return "Format d'email invalide";
  return null;
}

// ── Password strength (12+ chars, majuscule, minuscule, chiffre, symbole) ──
export interface PasswordCheck {
  length: boolean;      // ≥ 12
  upper: boolean;       // au moins 1 majuscule
  lower: boolean;       // au moins 1 minuscule
  digit: boolean;       // au moins 1 chiffre
  symbol: boolean;      // au moins 1 symbole non alphanumérique
}

export function checkPassword(pwd: string): PasswordCheck {
  return {
    length: pwd.length >= 12,
    upper:  /[A-Z]/.test(pwd),
    lower:  /[a-z]/.test(pwd),
    digit:  /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export function passwordScore(check: PasswordCheck): number {
  return (
    (check.length ? 1 : 0) +
    (check.upper  ? 1 : 0) +
    (check.lower  ? 1 : 0) +
    (check.digit  ? 1 : 0) +
    (check.symbol ? 1 : 0)
  );
}

export function passwordErrorMessage(pwd: string): string | null {
  if (!pwd) return "Mot de passe requis";
  const c = checkPassword(pwd);
  if (passwordScore(c) < 5) {
    return "Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un symbole.";
  }
  return null;
}

// ── Phone (format local simplifié, accepte chiffres + espaces) ──
const PHONE_RE = /^[0-9\s.-]{6,}$/;
export function validatePhone(phone: string): string | null {
  if (!phone) return "Téléphone requis";
  if (!PHONE_RE.test(phone.trim())) return "Format téléphone invalide (chiffres uniquement)";
  return null;
}
