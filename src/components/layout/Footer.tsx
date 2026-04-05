import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function Footer() {
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletter = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setNewsletterStatus("loading");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    if (error) {
      setNewsletterStatus(error.code === "23505" ? "success" : "error");
    } else {
      setNewsletterStatus("success");
    }
    setEmail("");
    setTimeout(() => setNewsletterStatus("idle"), 4000);
  };

  return (
    <footer className="bg-onyx text-neutral-light border-t border-dark-border">
      <div className="max-w-site mx-auto px-5 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12">
          {/* Brand */}
          <div>
            <div className="font-logo text-2xl text-gold mb-3">Atlas Studio</div>
            <p className="text-xs text-neutral-muted font-light leading-relaxed max-w-[220px] mb-5">
              La suite de gestion conçue pour les entreprises d'Afrique francophone. SYSCOHADA natif, Mobile Money, IA <span className="font-logo">Proph3t</span>.
            </p>

            {/* Newsletter */}
            <div className="text-neutral-muted/60 text-[11px] font-normal uppercase tracking-wider mb-2">Newsletter</div>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                onKeyDown={e => e.key === "Enter" && handleNewsletter()}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-[13px] outline-none focus:border-gold/50 transition-colors placeholder:text-neutral-600"
              />
              <button
                onClick={handleNewsletter}
                disabled={newsletterStatus === "loading"}
                className="px-3 py-2 bg-gold rounded-lg text-onyx hover:bg-gold-dark transition-colors"
              >
                <Send size={14} strokeWidth={1.5} />
              </button>
            </div>
            {newsletterStatus === "success" && (
              <p className="text-green-400 text-[11px] mt-1">Inscription confirmée !</p>
            )}
            {newsletterStatus === "error" && (
              <p className="text-red-400 text-[11px] mt-1">Erreur, réessayez.</p>
            )}
          </div>

          {/* Applications */}
          <div>
            <h4 className="text-[10px] font-normal uppercase tracking-[0.1em] text-neutral-muted/60 mb-4">Applications</h4>
            <ul className="text-xs text-neutral-muted font-light leading-[2.4]">
              {[
                { to: "/applications/atlas-finance", label: "Atlas Finance" },
                { to: "/applications/taxpilot", label: "Liass'Pilot" },
                { to: "/applications/cashpilot", label: "CashPilot" },
                { to: "/applications/wisehr", label: "WiseHR" },
                { to: "/applications/scrutix", label: "Scrutix" },
                { to: "/applications/advist", label: "ADVIST" },
                { to: "/applications/docjourney", label: "DocJourney" },
                { to: "/applications/cockpit", label: "COCKPIT" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-gold transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h4 className="text-[10px] font-normal uppercase tracking-[0.1em] text-neutral-muted/60 mb-4">Ressources</h4>
            <ul className="text-xs text-neutral-muted font-light leading-[2.4]">
              {[
                { to: "/applications", label: "Tous les produits" },
                { to: "/tarifs", label: "Tarifs" },
                { to: "/blog", label: "Blog" },
                { to: "/faq", label: "FAQ" },
                { to: "/portal", label: "Essai gratuit" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-gold transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-[10px] font-normal uppercase tracking-[0.1em] text-neutral-muted/60 mb-4">Entreprise</h4>
            <ul className="text-xs text-neutral-muted font-light leading-[2.4]">
              {[
                { to: "/a-propos", label: "À propos" },
                { to: "/contact", label: "Contact" },
                { to: "/mentions-legales", label: "Mentions légales" },
                { to: "/cgu", label: "CGU" },
                { to: "/confidentialite", label: "Confidentialité" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-gold transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-dark-border px-5 md:px-8 py-4 flex justify-between flex-wrap gap-4 max-w-site mx-auto">
        <p className="text-neutral-muted/60 text-[11px]">
          &copy; 2026 Atlas Studio<Link to="/admin/login" className="text-neutral-muted/60 hover:text-neutral-muted/60 cursor-default">.</Link> Abidjan, Côte d'Ivoire
        </p>
        <p className="text-neutral-muted/60 text-[11px]">
          Paiement sécurisé · Données hébergées · Supabase
        </p>
      </div>
    </footer>
  );
}
