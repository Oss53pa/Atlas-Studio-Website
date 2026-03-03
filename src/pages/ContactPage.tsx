import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { SectionHeading } from "../components/ui/SectionHeading";
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

  return (
    <>
    <SEOHead title="Contact" description="Contactez Atlas Studio. Notre equipe vous repond sous 24h." canonical="/contact" />
    <div className="bg-warm-bg text-neutral-text pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <SectionHeading
            title="Contactez-nous"
            subtitle="Une question ? Notre équipe vous répond sous 24h."
          />
        </ScrollReveal>

        {sent ? (
          <ScrollReveal>
            <div className="bg-white border border-warm-border rounded-2xl p-12 text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle size={48} className="text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="text-neutral-text text-xl font-bold mb-2">Message envoyé !</h3>
              <p className="text-neutral-muted text-sm">Nous vous répondrons dans les plus brefs délais.</p>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            <div className="bg-white border border-warm-border rounded-2xl p-8">
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Nom</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Email</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Entreprise</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Nom de votre entreprise"
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
                />
              </div>
              <div className="mb-6">
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Décrivez votre besoin..."
                  rows={5}
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors resize-y"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`btn-gold w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Envoi en cours...
                  </span>
                ) : (
                  "Envoyer le message"
                )}
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Contact info */}
        <ScrollReveal>
          <div className="flex justify-center gap-8 mt-10 flex-wrap">
            <span className="text-neutral-muted text-sm flex items-center gap-2">
              <Mail size={14} strokeWidth={1.5} className="text-gold" /> {content.contact.email}
            </span>
            <span className="text-neutral-muted text-sm flex items-center gap-2">
              <Phone size={14} strokeWidth={1.5} className="text-gold" /> {content.contact.phone}
            </span>
            <span className="text-neutral-muted text-sm flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.5} className="text-gold" /> {content.contact.city}
            </span>
          </div>
        </ScrollReveal>
      </div>
    </div>
    </>
  );
}
