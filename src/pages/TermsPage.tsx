import { useState, useEffect } from "react";
import { TERMS_V2, type TermsBlock, type TermsSection } from "../config/termsV2";
import { SEOHead } from "../components/ui/SEOHead";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

function BlockRenderer({ block }: { block: TermsBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-neutral-muted/95 text-[14px] leading-relaxed mb-4 font-light">
          {block.text}
        </p>
      );

    case "list":
      return (
        <div className="mb-4">
          {block.title && (
            <p className="text-neutral-light text-[13px] font-medium mb-3">{block.title}</p>
          )}
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="text-neutral-muted/95 text-[14px] leading-relaxed font-light flex items-baseline gap-3">
                <span className="meta-mono text-[10px] tabular-nums text-[#A9B57E]/80 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "definitions":
      return (
        <dl className="space-y-4 mb-4 border-t border-white/[0.06] pt-4">
          {block.items.map((d, i) => (
            <div key={i}>
              <dt className="meta-mono text-[11px] tracking-[0.16em] uppercase text-[#A9B57E] mb-1">{d.term}</dt>
              <dd className="text-neutral-muted/95 text-[14px] leading-relaxed font-light">{d.definition}</dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.12]">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left p-3 meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {row.map((cell, j) => (
                    <td key={j} className="p-3 text-neutral-muted/95 leading-relaxed font-light">
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
        warning:   { border: "border-amber-400/60",  text: "text-amber-200", Icon: AlertTriangle },
        info:      { border: "border-[#A9B57E]/60", text: "text-[#D6DDB3]",  Icon: Info },
        important: { border: "border-red-400/60",    text: "text-red-200",   Icon: AlertCircle },
      }[block.variant];
      const { Icon } = variantStyles;
      return (
        <div className={`flex gap-3 border-l-2 ${variantStyles.border} pl-4 py-2 mb-4`}>
          <Icon size={15} className={`${variantStyles.text} shrink-0 mt-1`} strokeWidth={1.8} />
          <p className={`text-[13px] leading-relaxed font-light ${variantStyles.text}`}>{block.text}</p>
        </div>
      );
    }

    case "subsection":
      return (
        <div className="mb-5">
          <h4 className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-3">
            {block.heading}
          </h4>
          <div>
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
    <article id={section.id} className="scroll-mt-28 border-t border-white/[0.06] pt-10 pb-12 first:border-t-0 first:pt-0">
      <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4 tabular-nums">
        Article {section.number}
      </div>
      <h2 className="font-display font-medium text-[24px] md:text-[32px] text-neutral-light tracking-tight leading-tight mb-7">
        {section.title}
      </h2>
      <div>
        {section.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </article>
  );
}

export default function TermsPage() {
  const [activeId, setActiveId] = useState<string>(TERMS_V2.sections[0].id);

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
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-onyx text-[#F5F5F5]">
      <SEOHead
        title="Conditions Generales d'Utilisation"
        description="Conditions generales d'utilisation Atlas Studio v2.0 - applicable au 11 avril 2026."
        canonical="/cgu"
      />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10 flex-wrap">
            <span className="meta-led" />
            <span>§ Document légal</span>
            <span className="text-neutral-light/25">/</span>
            <span className="text-[#A9B57E]">CGU · Version {TERMS_V2.version}</span>
            <span className="text-neutral-light/25 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-neutral-light/45">En vigueur le {TERMS_V2.effectiveDate}</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[40px] sm:text-[56px] md:text-[72px] lg:text-[80px] text-neutral-light max-w-5xl mb-8">
            Conditions Générales d'<span className="italic font-light text-neutral-light/70">Utilisation</span>.
          </h1>
          <p className="text-[15px] md:text-[16px] text-neutral-muted font-light max-w-2xl leading-relaxed">
            Régit l'usage de l'ensemble des applications éditées par Atlas Studio.
            Remplace la version {TERMS_V2.previousVersion}.
          </p>
        </div>
      </section>

      {/* CORPS — Sommaire sticky + sections */}
      <section className="relative py-20 md:py-28 px-5 md:px-10 lg:px-16">
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Sommaire */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Sommaire
            </div>
            <ol className="space-y-1">
              {TERMS_V2.sections.map((s) => {
                const isActive = activeId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full text-left py-2 meta-mono text-[11px] tracking-[0.14em] transition-colors flex items-baseline gap-3 ${
                        isActive ? "text-[#A9B57E]" : "text-neutral-light/55 hover:text-neutral-light"
                      }`}
                    >
                      <span className={`tabular-nums shrink-0 ${isActive ? "text-[#A9B57E]" : "text-[#A9B57E]/60"}`}>
                        {s.number}
                      </span>
                      <span className="leading-snug flex-1">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Sections */}
          <div className="lg:col-span-8">
            {TERMS_V2.sections.map((section) => (
              <SectionRenderer key={section.id} section={section} />
            ))}

            {/* Footer éditorial */}
            <div className="mt-12 pt-10 border-t border-white/[0.10]">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                § Contact
              </div>
              <p className="text-[14px] text-neutral-muted font-light leading-relaxed mb-3">
                Pour toute question relative aux présentes CGU :{" "}
                <a href={`mailto:${TERMS_V2.contactEmail}`} className="text-[#A9B57E] hover:text-[#D6DDB3] transition-colors underline-offset-4 hover:underline">
                  {TERMS_V2.contactEmail}
                </a>
              </p>
              <p className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40">
                {TERMS_V2.editor} · {TERMS_V2.location} · {TERMS_V2.website}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
