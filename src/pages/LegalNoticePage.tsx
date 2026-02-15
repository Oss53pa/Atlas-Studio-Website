import { LEGAL_CONTENT } from "../config/legal";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";

export default function LegalNoticePage() {
  const { title, sections } = LEGAL_CONTENT.legalNotice;

  return (
    <div className="bg-warm-bg text-neutral-text pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <SectionHeading title={title} />
        </ScrollReveal>

        {sections.map((s, i) => (
          <ScrollReveal key={i}>
            <div className="bg-white border border-warm-border rounded-2xl p-8 mb-4">
              <h3 className="text-neutral-text text-lg font-bold mb-3">{s.heading}</h3>
              <p className="text-neutral-body text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
