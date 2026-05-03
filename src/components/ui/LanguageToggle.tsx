import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("en") ? "en" : "fr";

  const toggle = () => {
    i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-gold border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-all duration-200 text-[12px]"
      title={currentLang === "fr" ? "Switch to English" : "Passer en Français"}
    >
      <Globe size={14} strokeWidth={1.5} />
      <span className="font-semibold uppercase tracking-wider">{currentLang === "fr" ? "EN" : "FR"}</span>
    </button>
  );
}
