import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { apiCall } from "../lib/api";
import { SEOHead } from "../components/ui/SEOHead";

export default function ContactPage() {
  const { content } = useContentContext();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!name || !email) {
      setError("Nom et email sont requis");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiCall("contact", { method: "POST", body: { name, email, company, message } });
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi du message";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Champ éditorial : underline-only sous hairline, mono label
  const fieldClass = "w-full bg-transparent text-neutral-light text-[16px] outline-none placeholder:text-neutral-muted/35 py-2 border-b border-white/[0.10] focus:border-[#A9B57E]/60 transition-colors";
  const labelClass = "block meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55 mb-2";

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Contact" description="Contactez Atlas Studio. Notre équipe vous répond sous 24h." canonical="/contact" />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>§ Contact</span>
            <span className="text-neutral-light/25">/</span>
            <span>Réponse sous 24h</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[22px] md:text-[28px] text-neutral-light max-w-4xl">
            Parlons-en. <span className="italic font-light text-neutral-light/70">Concrètement.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[560px] leading-relaxed mt-8">
            Une question, une démo, un besoin sur-mesure ? Notre équipe lit chaque message et vous répond personnellement.
          </p>
        </div>
      </section>

      {/* FORMULAIRE ÉDITORIAL */}
      <section className="relative py-20 md:py-28 px-5 md:px-10 lg:px-16">
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Coordonnées */}
          <div className="lg:col-span-4">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              Joindre l'équipe
            </div>
            <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {[
                { label: "Email",    value: content.contact.email },
                { label: "Téléphone", value: content.contact.phone },
                { label: "Bureau",   value: content.contact.city  },
              ].map((c) => (
                <div key={c.label} className="py-5">
                  <dt className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-2">
                    {c.label}
                  </dt>
                  <dd className="font-display text-[18px] md:text-[20px] text-neutral-light/90 tracking-tight">
                    {c.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mt-8">
              Lundi → Vendredi · 09h–18h GMT
            </p>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-8">
            {sent ? (
              <ScrollReveal>
                <div className="border-t border-[#A9B57E]/40 pt-10">
                  <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Confirmé
                  </div>
                  <h2 className="font-display font-medium text-[28px] md:text-[40px] text-neutral-light tracking-tight mb-4 leading-tight">
                    Message reçu.
                  </h2>
                  <p className="text-[15px] text-neutral-muted font-light leading-relaxed max-w-[540px]">
                    Nous vous répondons dans les plus brefs délais. Pendant ce temps, vous pouvez explorer nos applications ou consulter la FAQ.
                  </p>
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal>
                <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8">
                  § Message — Renseignez les champs ci-dessous
                </div>

                {error && (
                  <div className="mb-6 border-l-2 border-red-400/60 pl-4 py-2 meta-mono text-[11px] tracking-[0.18em] uppercase text-red-300">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                  <div>
                    <label className={labelClass}>01 · Nom</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>02 · Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.com" className={fieldClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>03 · Entreprise</label>
                    <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nom de votre entreprise" className={fieldClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>04 · Message</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre besoin..." rows={4} className={`${fieldClass} resize-y`} />
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={loading} className={`cta-arrow cta-arrow--primary mt-12 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {loading ? (
                    <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Envoi…</span>
                  ) : (
                    "Envoyer le message"
                  )}
                </button>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
