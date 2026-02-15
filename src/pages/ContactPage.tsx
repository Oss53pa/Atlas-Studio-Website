import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";

export default function ContactPage() {
  const { content } = useContentContext();
  const [sent, setSent] = useState(false);

  return (
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
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Nom</label>
                  <input placeholder="Votre nom" className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
                </div>
                <div className="flex-1">
                  <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Email</label>
                  <input placeholder="vous@entreprise.com" className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Entreprise</label>
                <input placeholder="Nom de votre entreprise" className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
              </div>
              <div className="mb-6">
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Message</label>
                <textarea placeholder="Décrivez votre besoin..." rows={5} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors resize-y" />
              </div>
              <button
                onClick={() => setSent(true)}
                className="btn-gold w-full"
              >
                Envoyer le message
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
  );
}
