import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContentContext } from "../components/layout/Layout";
import { AppCard } from "../components/ui/AppCard";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import { useSeoMeta } from "../lib/useSeoMeta";
import "../styles/home.css";

const FILTERS: [string, string][] = [["all", "Tout"], ["Module ERP", "Modules ERP"], ["App", "Apps métier"], ["App mobile", "Mobile"]];

export default function HomePage() {
  const { content } = useContentContext();
  const seo = useSeoMeta();
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState("all");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  /* Contenu RÉEL du site (CMS / config), aucun texte inventé. */
  const hero = content.hero;
  const stats = content.stats || [];
  const trust = (content.trustBar && content.trustBar.length ? content.trustBar : []) as string[];
  const steps = content.steps || [];
  const about = content.about;
  const apps = useMemo(() => content.apps || [], [content.apps]);
  const shownApps = apps.filter((a: any) => filter === "all" || a.type === filter);

  /* Titre du hero : 1re phrase normale, reste surligné volt (sur son vrai texte). */
  const heroTitle = (hero?.title || "").trim();
  const hParts = heroTitle.split(/(?<=[.!?])\s+/);
  const heroHead = hParts.length > 1 ? hParts[0] : heroTitle;
  const heroTail = hParts.length > 1 ? hParts.slice(1).join(" ") : "";

  /* Clôture : vraie phrase d'accroche (i18n), « gestion » surligné volt. */
  const readyTitle = t("home.readyTitle");
  const gi = readyTitle.toLowerCase().indexOf("gestion");
  const rtHead = gi >= 0 ? readyTitle.slice(0, gi) : readyTitle;
  const rtKey = gi >= 0 ? readyTitle.slice(gi, gi + 7) : "";
  const rtTail = gi >= 0 ? readyTitle.slice(gi + 7) : "";

  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;

    const splitWords = (el: Element) => {
      if ((el as HTMLElement).dataset.split) return;
      (el as HTMLElement).dataset.split = "1";
      let out = "";
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          (n.textContent || "").split(/(\s+)/).forEach((t) => { out += t.trim() === "" ? t : `<span class="ln"><span class="w">${t}</span></span>`; });
        } else { out += `<span class="ln"><span class="w">${(n as HTMLElement).outerHTML}</span></span>`; }
      });
      el.innerHTML = out;
      el.querySelectorAll<HTMLElement>(".w").forEach((w, i) => (w.style.transitionDelay = i * 0.05 + "s"));
    };
    if (!RM) r.querySelectorAll(".ml").forEach(splitWords);

    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: 0.18 });
    r.querySelectorAll(".ml,.fade,.hero .wrap").forEach((el) => io.observe(el));

    const grid = r.querySelector(".grid");
    let gio: IntersectionObserver | null = null;
    if (grid) {
      gio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { grid.classList.add("shown"); gio?.disconnect(); } }), { threshold: 0.12 });
      gio.observe(grid);
    }

    const prog = r.querySelector<HTMLElement>(".prog");
    const halo = r.querySelector<HTMLElement>(".halo");
    const raili = r.querySelector<HTMLElement>(".rail i");
    const railn = r.querySelector<HTMLElement>(".rail em");
    const capsSec = r.querySelector<HTMLElement>(".caps");
    const nCaps = steps.length || 1;
    const onScroll = () => {
      const de = document.documentElement, max = de.scrollHeight - innerHeight || 1;
      if (prog) prog.style.width = (scrollY / max) * 100 + "%";
      if (halo && !RM) halo.style.transform = `translateY(${scrollY * 0.18}px)`;
      if (capsSec && raili && railn) {
        const rect = capsSec.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.55 - rect.top) / (rect.height - innerHeight * 0.4 || 1)));
        raili.style.width = p * 100 + "%";
        const idx = Math.min(nCaps - 1, Math.floor(p * nCaps));
        if (steps[idx]) railn.textContent = (steps[idx].num || "").split(" ")[0];
        r.querySelectorAll(".cap").forEach((c, i) => c.classList.toggle("act", i === idx));
      }
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    const mt1 = r.querySelector<HTMLElement>(".mt1"), mt2 = r.querySelector<HTMLElement>(".mt2");
    let vel = 0, last = scrollY, o1 = 0, o2 = 0, raf = 0;
    const onV = () => { vel = Math.max(-70, Math.min(70, scrollY - last)); last = scrollY; };
    addEventListener("scroll", onV, { passive: true });
    const loop = () => {
      vel *= 0.92; const boost = Math.abs(vel) * 0.16, sk = Math.max(-6, Math.min(6, vel * 0.12));
      if (mt1) { const w = mt1.scrollWidth / 2 || 1; o1 -= 0.55 + boost; if (-o1 >= w) o1 += w; mt1.style.transform = `translateX(${o1}px) skewX(${-sk}deg)`; }
      if (mt2) { const w = mt2.scrollWidth / 2 || 1; o2 += 0.55 + boost; if (o2 >= 0) o2 -= w; mt2.style.transform = `translateX(${o2}px) skewX(${sk}deg)`; }
      raf = requestAnimationFrame(loop);
    };
    if (!RM && (mt1 || mt2)) loop();

    const mags: [HTMLElement, (e: MouseEvent) => void, () => void][] = [];
    if (!RM) r.querySelectorAll<HTMLElement>(".mag").forEach((el) => {
      const mv = (e: MouseEvent) => { const b = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * 0.25}px,${(e.clientY - b.top - b.height / 2) * 0.35}px)`; };
      const ml = () => (el.style.transform = "");
      el.addEventListener("mousemove", mv); el.addEventListener("mouseleave", ml);
      mags.push([el, mv, ml]);
    });

    const cv = canvasRef.current, cx = cv?.getContext("2d");
    let mx = 0, t = 0, craf = 0, CW = 0, CH = 0;
    const sz = () => { if (!cv) return; CW = cv.width = cv.offsetWidth * devicePixelRatio; CH = cv.height = cv.offsetHeight * devicePixelRatio; };
    const onMove = (e: MouseEvent) => (mx = e.clientX / innerWidth - 0.5);
    if (cv && cx) {
      sz(); addEventListener("resize", sz); addEventListener("mousemove", onMove);
      const draw = () => {
        t += RM ? 0 : 0.0015; cx.clearRect(0, 0, CW, CH);
        const c = getComputedStyle(document.documentElement).getPropertyValue("--c-text-2").trim() || "rgb(74,76,64)";
        for (let i = 0; i < 13; i++) {
          const p = i / 13; cx.beginPath(); cx.lineWidth = 1 * devicePixelRatio;
          cx.strokeStyle = c.replace(/rgb\(([^)]+)\)/, (_m, v) => `rgba(${v}, ${i % 3 === 0 ? 0.2 : 0.1})`);
          for (let x = -20; x <= CW + 20; x += 14 * devicePixelRatio) {
            const y = CH * (0.12 + p * 0.9) + Math.sin(x * 0.0016 + t * 2 + i * 0.7) * (26 + i * 4) * devicePixelRatio
              + Math.cos(x * 0.0009 - t * 1.3 + i) * 16 * devicePixelRatio + mx * 40 * devicePixelRatio * (p + 0.2);
            x === -20 ? cx.moveTo(x, y) : cx.lineTo(x, y);
          }
          cx.stroke();
        }
        craf = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      removeEventListener("scroll", onScroll); removeEventListener("scroll", onV);
      removeEventListener("resize", sz); removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf); cancelAnimationFrame(craf);
      io.disconnect(); gio?.disconnect();
      mags.forEach(([el, mv, ml]) => { el.removeEventListener("mousemove", mv); el.removeEventListener("mouseleave", ml); });
    };
  }, [apps.length, steps.length]);

  const marqItems = (trust.length ? trust : apps.map((a) => a.name));
  const marqSeg = marqItems.map((w, i) => (<span key={w + i}><b>{w}</b><s>✦</s></span>));

  return (
    <div className="hv2" ref={root}>
      <SEOHead
        title="Accueil"
        description={seo.metaDescription || hero?.subtitle || "Atlas Studio — apps SaaS pour les entreprises africaines."}
        canonical={seo.canonical || "/"}
        ogImage={seo.ogImage}
        keywords={seo.keywords}
        noindex={seo.noindex}
        titleOverride={seo.metaTitle}
      />
      <div className="prog" />

      {/* HERO — vrai titre / sous-titre / CTA */}
      <section className="hero">
        <canvas className="topo" ref={canvasRef} />
        <div className="halo" />
        <div className="wrap">
          <h1 className="hv-h1 ml">
            {heroHead}{heroTail && <> <span className="scr">{heroTail}</span></>}
          </h1>
          <svg className="sig" viewBox="0 0 340 34" aria-hidden="true"><path d="M6 24 C 70 6, 150 6, 210 18 S 300 30, 334 10" /></svg>
          <p className="sub fade">{hero?.subtitle}</p>
          <div className="cta-row fade">
            <Link to="/portal" className="hb hb-primary mag">{hero?.cta1 || "Créer un compte"} →</Link>
            <Link to="/applications" className="hb hb-ghost mag">{hero?.cta2 || "Découvrir les apps"}</Link>
          </div>
          {stats.length > 0 && (
            <div className="hstats fade">
              {stats.slice(0, 4).map((s: any) => (
                <div className="s" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="cue">SCROLL<i /></div>
      </section>

      {/* MARQUEE — trustBar réel */}
      {marqItems.length > 0 && (<>
        <div className="marq"><div className="track mt1">{marqSeg}{marqSeg}</div></div>
        <div className="marq r2"><div className="track mt2">{marqSeg}{marqSeg}</div></div>
      </>)}

      {/* MANIFESTE — about réel */}
      {about?.p1 && (
        <section className="manif">
          <div className="halo2" />
          <div className="wrap">
            <p className="big ml">{about.p1}</p>
            {about.p2 && <p className="tagline fade">{about.p2}</p>}
          </div>
        </section>
      )}

      {/* MÉTHODE — steps réels (01–0N) */}
      {steps.length > 0 && (
        <section className="caps">
          <div className="wrap">
            <h2 className="ml">Comment ça marche</h2>
            <p className="lead fade">De la création du compte à l'automatisation, en quelques étapes.</p>
            <div className="body">
              <div className="rail"><em>{(steps[0].num || "").split(" ")[0]}</em><i /></div>
              <div>{steps.map((s: any) => (
                <div className="cap" key={s.num}><div className="n">{(s.num || "").split(" ")[0]}</div>
                  <div><h3 className="ml">{s.title}</h3><p>{s.desc}</p></div></div>
              ))}</div>
            </div>
          </div>
        </section>
      )}

      {/* SUITE — vraies apps */}
      {apps.length > 0 && (
        <section className="suite" id="suite">
          <div className="wrap">
            <div className="head"><h2 className="ml">Nos applications</h2>
              <p className="mono fade" style={{ letterSpacing: ".14em", color: "var(--hv-muted)" }}>{apps.length} apps · filtrez &amp; survolez</p></div>
            <div className="filters">
              {FILTERS.map(([f, label]) => (
                <button key={f} className={filter === f ? "act" : ""} onClick={() => setFilter(f)}>{label}</button>
              ))}
            </div>
            <div className="appgrid">
              {shownApps.map((a: any, i: number) => (
                <ScrollReveal key={a.id} delay={i * 55}><AppCard app={a} index={i} /></ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTEURS — réels */}
      {content.sectors && content.sectors.length > 0 && (
        <section className="sect">
          <div className="wrap">
            <h2 className="ml">Pensé pour tous les secteurs</h2>
            <p className="lead fade">Des outils qui s'adaptent aux réalités de chaque métier, partout en Afrique francophone.</p>
            <div className="chips">
              {content.sectors.map((s: any) => (
                <span className="chip" key={s.name}><i />{s.name}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* COMPARATIF — réel */}
      {content.comparatif && content.comparatif.rows?.length > 0 && (
        <section className="comp">
          <div className="wrap">
            <h2 className="ml">Pourquoi Atlas Studio</h2>
            <p className="lead fade">Comparé aux solutions du marché, sur ce qui compte vraiment ici.</p>
            <div className="tw fade">
              <table>
                <thead><tr>{content.comparatif.headers.map((h: string) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {content.comparatif.rows.map((row: any) => (
                    <tr key={row.name} className={row.highlight ? "hl" : ""}>
                      <td>{row.name}</td>
                      {row.values.map((v: string, j: number) => <td key={j}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TÉMOIGNAGES — réels */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="tmo">
          <div className="wrap">
            <h2 className="ml">Ils nous font confiance</h2>
            <div className="g2">
              {content.testimonials.map((t: any) => (
                <div className="q fade" key={t.name}>
                  <p>« {t.text} »</p>
                  <div className="who">
                    <span className="av">{t.avatar}</span>
                    <span><b>{t.name}</b><span>{t.role} · {t.company}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ — réelle */}
      {content.faqs && content.faqs.length > 0 && (
        <section className="faq">
          <div className="wrap">
            <h2 className="ml">Questions fréquentes</h2>
            <div className="list">
              {content.faqs.map((f: any, i: number) => (
                <div className={"item" + (faqOpen === i ? " open" : "")} key={i}>
                  <button className="qq" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}>
                    {f.q}<em>+</em>
                  </button>
                  <div className="aa">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DUAL — CTA réels */}
      <section className="dual wrap">
        <Link className="panel lg mag" to="/portal"><div className="k">POUR COMMENCER</div><h3 className="ml">{hero?.cta1 || "Créer un compte"}.</h3>
          <p>Inscription en 2 minutes, votre espace entreprise prêt immédiatement.</p><span className="arw">{hero?.cta1 || "Créer un compte"} →</span></Link>
        <Link className="panel dk mag" to="/portal"><div className="k">DÉJÀ CLIENT</div><h3 className="ml">Accéder au portail.</h3>
          <p>Licences, factures, tickets et téléchargements — tout au même endroit.</p><span className="arw" style={{ color: "var(--hv-volt)" }}>Ouvrir le portail →</span></Link>
      </section>

      {/* CLÔTURE — vraie phrase d'accroche (i18n), découpe par mots */}
      <section className="fband">
        <div className="wrap">
          <div className="fbig ml">{rtHead}{rtKey && <span className="g">{rtKey}</span>}{rtTail}</div>
          <p className="fsub">{t("home.readySubtitle")}</p>
          <div className="fcta">
            <Link to="/portal" className="hb hb-primary mag">{hero?.cta1 || "Créer un compte"} →</Link>
            <Link to="/contact" className="hb hb-ghost mag" style={{ color: "#F4F4ED", borderColor: "rgba(244,244,237,.3)" }}>{t("home.contactUs")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
