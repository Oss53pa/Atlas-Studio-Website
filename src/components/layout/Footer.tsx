import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useContentContext } from "./Layout";

const SOCIAL_ICONS: Record<string, (props: { size?: number }) => JSX.Element> = {
  facebook: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  instagram: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  linkedin: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ),
  twitter: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  youtube: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
  tiktok: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
  ),
};

interface FooterColumn {
  label: string;
  links: { to: string; label: string }[];
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { content } = useContentContext();
  const social = content.social;
  const socialLinks = social ? Object.entries(social).filter(([, url]) => url) : [];

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

  const cols: FooterColumn[] = [
    {
      label: "Applications",
      links: (content.apps || []).map((app) => ({ to: `/applications/${app.id}`, label: app.name })),
    },
    {
      label: "Ressources",
      links: [
        { to: "/applications", label: "Tous les produits" },
        { to: "/tarifs",       label: "Tarifs" },
        { to: "/blog",         label: "Blog" },
        { to: "/faq",          label: "FAQ" },
        { to: "/portal",       label: "Souscrire" },
      ],
    },
    {
      label: "Entreprise",
      links: [
        { to: "/a-propos",         label: "À propos" },
        { to: "/contact",          label: "Contact" },
        { to: "/mentions-legales", label: "Mentions légales" },
        { to: "/cgu",              label: "CGU" },
        { to: "/confidentialite",  label: "Confidentialité" },
      ],
    },
  ];

  return (
    <footer className="relative bg-onyx text-neutral-light border-t border-white/[0.06] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.35) 50%, transparent 100%)" }} />
      <div className="absolute inset-0 hero-techgrid opacity-40 pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16 py-20 md:py-24">
        {/* Méta-strip d'ouverture */}
        <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/45 flex items-baseline gap-3 md:gap-4 mb-14">
          <span className="meta-led" />
          <span>§ Pied — Atlas Studio · MMXXVI</span>
          <span className="text-neutral-light/25 hidden sm:inline">/</span>
          <span className="hidden sm:inline text-neutral-light/35">Abidjan · Côte d'Ivoire</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-x-10 gap-y-12">
          {/* Bloc marque + newsletter */}
          <div>
            <div className="font-logo text-gradient-champagne text-[44px] leading-none mb-5">Atlas Studio</div>
            <p className="text-[14px] text-neutral-muted font-light leading-relaxed max-w-[320px] mb-8">
              La suite de gestion conçue pour les entreprises d'Afrique francophone. SYSCOHADA natif, Mobile Money, IA <span className="font-logo text-[16px]">Proph3t</span>.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex gap-2 mb-10">
                {socialLinks.map(([key, url]) => {
                  const Icon = SOCIAL_ICONS[key];
                  if (!Icon) return null;
                  return (
                    <a key={key} href={url as string} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full border border-white/[0.10] flex items-center justify-center text-neutral-muted hover:text-[#A9B57E] hover:border-[#A9B57E]/40 transition-all">
                      <Icon size={13} />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Newsletter — bloc éditorial */}
            <div className="border-t border-white/[0.06] pt-6">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-3">
                § Newsletter
              </div>
              <p className="text-[13px] text-neutral-muted/85 font-light leading-relaxed mb-4 max-w-[320px]">
                Une note tous les deux mois sur l'OHADA digital. Pas de spam.
              </p>
              <div className="flex items-baseline gap-3 border-b border-white/[0.15] pb-3">
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  onKeyDown={e => e.key === "Enter" && handleNewsletter()}
                  className="flex-1 bg-transparent text-neutral-light text-[14px] outline-none placeholder:text-neutral-muted/50 meta-mono"
                />
                <button
                  onClick={handleNewsletter}
                  disabled={newsletterStatus === "loading"}
                  className="meta-mono text-[11px] tracking-[0.18em] uppercase text-[#A9B57E] hover:text-[#D6DDB3] transition-colors disabled:opacity-60"
                  aria-label="S'inscrire"
                >
                  S'inscrire →
                </button>
              </div>
              {newsletterStatus === "success" && (
                <p className="meta-mono text-[10px] tracking-[0.18em] uppercase text-[#A9B57E] mt-3 flex items-center gap-2">
                  <CheckCircle2 size={11} /> Inscription confirmée
                </p>
              )}
              {newsletterStatus === "error" && (
                <p className="meta-mono text-[10px] tracking-[0.18em] uppercase text-red-400 mt-3">
                  Erreur · réessayez
                </p>
              )}
            </div>
          </div>

          {/* Colonnes éditoriales */}
          {cols.map((col, ci) => (
            <div key={col.label}>
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6 flex items-baseline gap-2">
                <span className="tabular-nums text-neutral-light/45">{String(ci + 1).padStart(2, "0")}</span>
                <span>{col.label}</span>
              </div>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[14px] text-neutral-light/75 hover:text-[#A9B57E] transition-colors font-light leading-snug">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.06] px-5 md:px-10 lg:px-16 py-6 max-w-[1280px] mx-auto flex justify-between flex-wrap gap-4 items-baseline">
        <p className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/35">
          © {new Date().getFullYear()} Atlas Studio
          <Link to="/admin/login" className="text-neutral-light/35 hover:text-neutral-light/35 cursor-default mx-0.5">.</Link>
          · Abidjan, Côte d'Ivoire
        </p>
        <p className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/35">
          Données chiffrées AES-256 · IA souveraine
        </p>
      </div>
    </footer>
  );
}
