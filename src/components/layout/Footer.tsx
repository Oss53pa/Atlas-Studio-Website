import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, Send } from "lucide-react";
import { Logo } from "../ui/Logo";
import { supabase } from "../../lib/supabase";

export function Footer() {
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletter = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setNewsletterStatus("loading");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    if (error) {
      setNewsletterStatus(error.code === "23505" ? "success" : "error"); // 23505 = already exists
    } else {
      setNewsletterStatus("success");
    }
    setEmail("");
    setTimeout(() => setNewsletterStatus("idle"), 4000);
  };

  return (
    <footer className="bg-onyx text-neutral-light border-t border-white/10">
      <div className="max-w-site mx-auto px-5 md:px-8 py-8 md:py-10">
        <div className="flex justify-between items-start flex-wrap gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-3">
              <Logo size={20} color="text-neutral-light" />
            </div>
            <p className="text-neutral-400 text-[13px] leading-relaxed mb-4">
              Des outils digitaux professionnels pour les entreprises africaines.
            </p>

            {/* Newsletter */}
            <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-2">Newsletter</div>
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
                className="px-3 py-2 bg-gold rounded-lg text-onyx hover:bg-gold/90 transition-colors"
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

          <div className="flex gap-12 flex-wrap">
            {/* Products column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Produits</div>
              {[
                { to: "/applications", label: "Tous les produits" },
                { to: "/tarifs", label: "Tarifs" },
                { to: "/portal", label: "Essai gratuit" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Company column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Entreprise</div>
              {[
                { to: "/a-propos", label: "À propos" },
                { to: "/contact", label: "Contact" },
                { to: "/faq", label: "FAQ" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Legal column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Légal</div>
              {[
                { to: "/mentions-legales", label: "Mentions légales" },
                { to: "/cgu", label: "CGU" },
                { to: "/confidentialite", label: "Confidentialité" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-5 flex justify-between flex-wrap gap-4">
          <p className="text-neutral-500 text-xs">&copy; 2026 Atlas Studio. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="text-neutral-700 hover:text-neutral-500 transition-colors" title="Administration">
              <Shield size={13} strokeWidth={1.5} />
            </Link>
            <p className="text-neutral-500 text-xs flex items-center gap-1">
              Conçu avec <Heart size={12} strokeWidth={1.5} className="text-gold" /> à Abidjan
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
