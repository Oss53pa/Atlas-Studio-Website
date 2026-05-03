import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2, Loader2, Send } from "lucide-react";
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
      await apiCall("contact", {
        method: "POST",
        body: { name, email, company, message },
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-ink-200 border border-white/[0.06] rounded-lg text-neutral-light text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all duration-200 placeholder:text-neutral-muted/50";

  return (
    <>
      <SEOHead title="Contact" description="Contactez Atlas Studio. Notre équipe vous répond sous 24h." canonical="/contact" />
      <div className="bg-onyx min-h-screen pt-28 pb-20 md:pt-32 md:pb-28 px-5 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">Contact</div>
            <h1 className="text-4xl md:text-5xl font-medium text-gradient-light leading-[1.12] tracking-tight mb-4">Contactez-nous</h1>
            <p className="text-[15px] text-neutral-muted font-light mb-12">Une question ? Notre équipe vous répond sous 24h.</p>
          </ScrollReveal>

          {sent ? (
            <ScrollReveal>
              <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-14 text-center overflow-hidden shadow-premium">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.55) 50%, transparent 100%)" }}
                />
                <div className="mb-5 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-gold" strokeWidth={1.8} />
                  </div>
                </div>
                <h3 className="text-neutral-light text-xl font-semibold mb-2 tracking-tight">Message envoyé !</h3>
                <p className="text-neutral-muted text-sm font-light">Nous vous répondrons dans les plus brefs délais.</p>
              </div>
            </ScrollReveal>
          ) : (
            <ScrollReveal>
              <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-9 overflow-hidden shadow-premium">
                <div className="absolute -top-px left-[8%] right-[8%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.5) 50%, transparent 100%)" }}
                />
                {error && (
                  <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-neutral-light text-[12px] font-semibold uppercase tracking-wider mb-2">Nom</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" className={inputClass} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-neutral-light text-[12px] font-semibold uppercase tracking-wider mb-2">Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.com" className={inputClass} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-neutral-light text-[12px] font-semibold uppercase tracking-wider mb-2">Entreprise</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nom de votre entreprise" className={inputClass} />
                </div>
                <div className="mb-7">
                  <label className="block text-neutral-light text-[12px] font-semibold uppercase tracking-wider mb-2">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre besoin..." rows={5} className={`${inputClass} resize-y`} />
                </div>
                <button onClick={handleSubmit} disabled={loading} className={`btn-gold w-full ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Envoi en cours...</span>
                  ) : (
                    <>
                      Envoyer le message
                      <Send size={15} strokeWidth={2.2} />
                    </>
                  )}
                </button>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal>
            <div className="flex justify-center gap-8 mt-12 flex-wrap">
              <span className="text-neutral-muted text-sm font-light flex items-center gap-2">
                <Mail size={15} strokeWidth={1.5} className="text-gold" /> {content.contact.email}
              </span>
              <span className="text-neutral-muted text-sm font-light flex items-center gap-2">
                <Phone size={15} strokeWidth={1.5} className="text-gold" /> {content.contact.phone}
              </span>
              <span className="text-neutral-muted text-sm font-light flex items-center gap-2">
                <MapPin size={15} strokeWidth={1.5} className="text-gold" /> {content.contact.city}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </>
  );
}
