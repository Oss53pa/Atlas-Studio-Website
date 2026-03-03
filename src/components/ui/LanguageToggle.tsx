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
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-light hover:bg-white/5 transition-all text-[13px]"
      title={currentLang === "fr" ? "Switch to English" : "Passer en Français"}
    >
      <Globe size={14} strokeWidth={1.5} />
      <span className="font-medium uppercase">{currentLang === "fr" ? "EN" : "FR"}</span>
    </button>
  );
}
