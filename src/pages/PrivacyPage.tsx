import { LEGAL_CONTENT } from "../config/legal";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";

export default function PrivacyPage() {
  const { title, sections } = LEGAL_CONTENT.privacy;

  return (
    <div className="bg-onyx text-[#F5F5F5] pt-28 pb-20 md:pt-32 md:pb-28 px-5 md:px-8 min-h-screen relative overflow-hidden">
      <SEOHead title="Confidentialite" description="Politique de confidentialite et protection des donnees Atlas Studio." canonical="/confidentialite" />
      <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />
      <div className="relative max-w-3xl mx-auto">
        <ScrollReveal>
          <SectionHeading title={title} />
        </ScrollReveal>

        {sections.map((s, i) => (
          <ScrollReveal key={i}>
            <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-8 mb-4 overflow-hidden">
              <div className="absolute -top-px left-[10%] right-[10%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.4) 50%, transparent 100%)" }}
              />
              <h3 className="text-neutral-light text-lg font-semibold mb-3 tracking-tight">{s.heading}</h3>
              <p className="text-neutral-muted text-sm leading-relaxed whitespace-pre-line font-light">{s.content}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
