import { LEGAL_CONTENT } from "../config/legal";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";

export default function LegalNoticePage() {
  const { title, sections } = LEGAL_CONTENT.legalNotice;

  return (
    <div className="bg-onyx text-[#F5F5F5] pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8 min-h-screen">
      <SEOHead title="Mentions Legales" description="Mentions legales du site Atlas Studio." canonical="/mentions-legales" />
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <SectionHeading title={title} />
        </ScrollReveal>

        {sections.map((s, i) => (
          <ScrollReveal key={i}>
            <div className="bg-dark-bg2 border border-dark-border rounded-2xl p-8 mb-4">
              <h3 className="text-[#F5F5F5] text-lg font-normal mb-3">{s.heading}</h3>
              <p className="text-neutral-muted text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
