import { useState, useEffect } from "react";
import { TERMS_V2, type TermsBlock, type TermsSection } from "../config/termsV2";
import { SEOHead } from "../components/ui/SEOHead";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

function BlockRenderer({ block }: { block: TermsBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-neutral-muted text-[13px] leading-relaxed mb-3">
          {block.text}
        </p>
      );

    case "list":
      return (
        <div className="mb-3">
          {block.title && (
            <p className="text-[#F5F5F5] text-[13px] font-semibold mb-2">{block.title}</p>
          )}
          <ul className="space-y-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="text-neutral-muted text-[13px] leading-relaxed flex gap-2">
                <span className="text-gold mt-1.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "definitions":
      return (
        <dl className="space-y-2.5 mb-3">
          {block.items.map((d, i) => (
            <div key={i} className="border-l-2 border-gold/30 pl-3">
              <dt className="text-gold text-[13px] font-semibold">{d.term}</dt>
              <dd className="text-neutral-muted text-[13px] leading-relaxed mt-0.5">{d.definition}</dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-[12px] border border-dark-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-white/[0.03]">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-[#F5F5F5] font-semibold border-b border-dark-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-dark-border/50 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-neutral-muted leading-relaxed">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout": {
      const variantStyles = {
        warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700", Icon: AlertTriangle },
        info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700", Icon: Info },
        important: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-700", Icon: AlertCircle },
      }[block.variant];
      const { Icon } = variantStyles;
      return (
        <div className={`flex gap-2.5 p-3 rounded-lg border ${variantStyles.bg} ${variantStyles.border} mb-3`}>
          <Icon size={16} className={`${variantStyles.text} shrink-0 mt-0.5`} />
          <p className={`text-[13px] leading-relaxed ${variantStyles.text}`}>{block.text}</p>
        </div>
      );
    }

    case "subsection":
      return (
        <div className="mb-4">
          <h4 className="text-[#F5F5F5] text-[14px] font-semibold mb-2">{block.heading}</h4>
          <div className="pl-3 border-l border-dark-border">
            {block.blocks.map((b, i) => (
              <BlockRenderer key={i} block={b} />
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

function SectionRenderer({ section }: { section: TermsSection }) {
  return (
    <section id={section.id} className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-6 md:p-8 mb-4 scroll-mt-28 overflow-hidden">
      <div className="absolute -top-px left-[8%] right-[8%] h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.4) 50%, transparent 100%)" }}
      />
      <div className="flex items-baseline gap-3 mb-5 pb-4 border-b border-white/[0.06]">
        <span className="text-gradient-gold text-2xl font-bold font-mono tracking-tight">{section.number}</span>
        <h2 className="text-neutral-light text-lg md:text-xl font-semibold tracking-tight">{section.title}</h2>
      </div>
      <div>
        {section.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const [activeId, setActiveId] = useState<string>(TERMS_V2.sections[0].id);

  // Track the section currently visible in the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );
    TERMS_V2.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-onyx text-[#F5F5F5] pt-28 pb-20 md:pt-32 md:pb-28 px-5 md:px-8 min-h-screen relative overflow-hidden">
      <SEOHead
        title="Conditions Generales d'Utilisation"
        description="Conditions generales d'utilisation Atlas Studio v2.0 - applicable au 11 avril 2026."
        canonical="/cgu"
      />

      <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/25 mb-5 backdrop-blur-sm">
            <span className="text-gold text-[11px] font-semibold uppercase tracking-[0.16em]">
              Version {TERMS_V2.version}
            </span>
            <span className="text-neutral-muted text-[11px]">·</span>
            <span className="text-neutral-muted text-[11px]">En vigueur le {TERMS_V2.effectiveDate}</span>
          </div>
          <h1 className="text-gradient-light text-3xl md:text-5xl font-medium mb-4 tracking-tight leading-[1.12]">
            Conditions Generales d'Utilisation
          </h1>
          <p className="text-neutral-muted text-sm max-w-2xl mx-auto leading-relaxed font-light">
            Les presentes conditions regissent l'utilisation de l'ensemble des Applications editees
            par Atlas Studio. Elles remplacent la version {TERMS_V2.previousVersion}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sommaire (Table of Contents) */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto overflow-hidden">
              <div className="absolute -top-px left-[10%] right-[10%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.4) 50%, transparent 100%)" }}
              />
              <h3 className="text-gold text-[11px] font-semibold uppercase tracking-[0.16em] mb-4 px-2">
                Sommaire
              </h3>
              <nav>
                <ul className="space-y-0.5">
                  {TERMS_V2.sections.map((s) => {
                    const isActive = activeId === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => scrollToSection(s.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] transition-colors flex items-start gap-2 ${
                            isActive
                              ? "bg-gold/10 text-gold"
                              : "text-neutral-muted hover:text-[#F5F5F5] hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className={`font-mono text-[11px] shrink-0 ${isActive ? "text-gold" : "text-neutral-500"}`}>
                            {s.number}
                          </span>
                          <span className="leading-snug">{s.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div>
            {TERMS_V2.sections.map((section) => (
              <SectionRenderer key={section.id} section={section} />
            ))}

            {/* Footer */}
            <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-7 mt-4 text-center overflow-hidden">
              <div className="absolute -top-px left-[10%] right-[10%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.4) 50%, transparent 100%)" }}
              />
              <p className="text-neutral-muted text-[12px] leading-relaxed font-light">
                Pour toute question relative aux presentes CGU, contactez-nous a{" "}
                <a href={`mailto:${TERMS_V2.contactEmail}`} className="text-gold hover:text-gold-light transition-colors">
                  {TERMS_V2.contactEmail}
                </a>
                .
              </p>
              <p className="text-neutral-muted text-[11px] mt-2 font-light">
                {TERMS_V2.editor} · {TERMS_V2.location} · {TERMS_V2.website}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
