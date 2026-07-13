import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppCatalog } from "../hooks/useAppCatalog";
import { appIcon } from "../lib/appIcons";
import { SEOHead } from "../components/ui/SEOHead";
import "../styles/home.css";

/* Principes de la plateforme (01–06) — éditorial, véridique. */
const CAPS: [string, string, string][] = [
  ["01", "Référentiel SYSCOHADA natif", "Plan comptable, TVA, liasse et états financiers de l'espace OHADA sont intégrés au cœur du système — pas un module en option, mais le socle même sur lequel chaque logiciel est bâti."],
  ["02", "Multi-pays UEMOA & CEMAC", "Dix-sept États, deux zones, une seule instance. Devises, taux et obligations fiscales locales sont gérés par pays, sans dupliquer votre installation."],
  ["03", "Zéro ressaisie", "Une donnée saisie une fois circule partout : une écriture de paie alimente la compta, qui alimente la liasse, qui alimente le reporting. Fini les exports-imports entre outils."],
  ["04", "Temps réel & prédictif", "Tableaux de bord vivants, clôtures accélérées et projections : le système n'enregistre pas seulement le passé, il éclaire la décision suivante."],
  ["05", "IA & automatisation", "Rapprochements, relances de recouvrement, contrôles de cohérence : les tâches répétitives sont automatisées pour rendre vos équipes au travail à valeur ajoutée."],
  ["06", "Sécurité & conformité", "Traçabilité complète, droits fins et hébergement maîtrisé — la conformité fiscale et la protection des données sont par défaut, pas en option."],
];
const MARQ = ["SYSCOHADA", "UEMOA", "CEMAC", "PAIE", "COMPTABILITÉ", "LIASSE FISCALE", "RECOUVREMENT", "TRÉSORERIE", "RESTAURATION", "TONTINE", "AUDIT BANCAIRE", "SIGNATURE"];
const FILTERS: [string, string][] = [["all", "Tout"], ["Module ERP", "Modules ERP"], ["App", "Apps métier"], ["App mobile", "Mobile"]];
const FALLBACK = [
  { id: "atlas-people", name: "Atlas People", color: "#C97E12", type: "Module ERP", tagline: "SIRH complet — paie, RH, talents & conformité.", icon: "users" },
  { id: "atlas-fa", name: "Atlas F&A", color: "#D9663B", type: "Module ERP", tagline: "Finance & administration, cœur comptable SYSCOHADA.", icon: "calculator" },
  { id: "cockpit-fa", name: "Cockpit F&A", color: "#B8954A", type: "App", tagline: "Pilotage financier & reporting SYSCOHADA.", icon: "gauge-circle" },
  { id: "liasspilot", name: "Liass'Pilot", color: "#0E8FB0", type: "App", tagline: "Liasse fiscale SYSCOHADA, sans erreur.", icon: "file-text" },
  { id: "advist", name: "Advist", color: "#0E9E70", type: "App", tagline: "Workflow documentaire & signature électronique.", icon: "folder-open" },
  { id: "tablesmart", name: "TableSmart", color: "#C9A84C", type: "App", tagline: "Digitalisation complète pour la restauration.", icon: "utensils" },
  { id: "wedo", name: "WeDo", color: "#D4A03C", type: "App mobile", tagline: "Tontine digitale, sécurisée.", icon: "hand-coins" },
];

export default function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { appList } = useAppCatalog();
  const [filter, setFilter] = useState("all");

  const apps = useMemo(() => {
    const src = appList && appList.length ? appList : (FALLBACK as unknown as typeof appList);
    return src.map((a: any, i: number) => ({
      id: a.id ?? String(i),
      code: "A" + String(i + 1).padStart(2, "0"),
      name: a.name ?? "App",
      color: a.color || "var(--c-accent)",
      type: a.type || "App",
      tagline: a.tagline || a.description || "",
      Icon: appIcon(a.icon),
    }));
  }, [appList]);

  /* Animations — mise en place scopée à la home. */
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

    const fb = r.querySelector<HTMLElement>(".fbig");
    if (fb && !fb.dataset.split) {
      fb.dataset.split = "1";
      const g = fb.dataset.g || "", txt = fb.textContent || "", idx = txt.indexOf(g);
      let out = "";
      [...txt].forEach((c, i) => { const on = g && i >= idx ? " g" : ""; out += c === " " ? " " : `<span class="ln"><span class="w${on}">${c}</span></span>`; });
      fb.innerHTML = out;
      fb.querySelectorAll<HTMLElement>(".w").forEach((w, i) => (w.style.transitionDelay = i * 0.02 + "s"));
    }

    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: 0.2 });
    r.querySelectorAll(".ml,.fade,.hero .wrap,.fbig").forEach((el) => io.observe(el));

    const grid = r.querySelector(".grid");
    let gio: IntersectionObserver | null = null;
    if (grid) {
      gio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { grid.classList.add("shown"); gio?.disconnect(); } }), { threshold: 0.12 });
      gio.observe(grid);
    }

    const nio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target as HTMLElement, tg = +(el.dataset.count || "0"); let s = 0, st = Math.max(1, Math.round(tg / 26));
      const iv = setInterval(() => { s += st; if (s >= tg) { s = tg; clearInterval(iv); } el.textContent = String(s); }, 26);
      nio.unobserve(el);
    }), { threshold: 1 });
    r.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => nio.observe(el));

    const prog = r.querySelector<HTMLElement>(".prog");
    const halo = r.querySelector<HTMLElement>(".halo");
    const raili = r.querySelector<HTMLElement>(".rail i");
    const railn = r.querySelector<HTMLElement>(".rail em");
    const capsSec = r.querySelector<HTMLElement>(".caps");
    const onScroll = () => {
      const de = document.documentElement, max = de.scrollHeight - innerHeight || 1;
      if (prog) prog.style.width = (scrollY / max) * 100 + "%";
      if (halo && !RM) halo.style.transform = `translateY(${scrollY * 0.18}px)`;
      if (capsSec && raili && railn) {
        const rect = capsSec.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.55 - rect.top) / (rect.height - innerHeight * 0.4 || 1)));
        raili.style.width = p * 100 + "%";
        const idx = Math.min(CAPS.length - 1, Math.floor(p * CAPS.length));
        railn.textContent = CAPS[idx][0];
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
    if (!RM) loop();

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
      io.disconnect(); nio.disconnect(); gio?.disconnect();
      mags.forEach(([el, mv, ml]) => { el.removeEventListener("mousemove", mv); el.removeEventListener("mouseleave", ml); });
    };
  }, [apps.length]);

  const marqSeg = MARQ.map((w) => (<span key={w}><b>{w}</b><s>✦</s></span>));

  return (
    <div className="hv2" ref={root}>
      <SEOHead title="Le système d'exploitation de la gestion africaine" description="Onze logiciels bâtis pour le référentiel SYSCOHADA : paie, comptabilité, liasse fiscale, recouvrement, restauration, tontine. Un seul socle, zéro ressaisie." canonical="/" />
      <div className="prog" />

      {/* HERO */}
      <section className="hero">
        <canvas className="topo" ref={canvasRef} />
        <div className="halo" />
        <div className="wrap">
          <div className="eyebrow mono ml">Système d'exploitation · Finance &amp; Gestion · OHADA</div>
          <h1 className="hv-h1 ml">Le système d'exploitation de la <span className="scr">gestion&nbsp;africaine</span>.</h1>
          <svg className="sig" viewBox="0 0 340 34" aria-hidden="true"><path d="M6 24 C 70 6, 150 6, 210 18 S 300 30, 334 10" /></svg>
          <p className="sub fade">Onze logiciels bâtis pour le référentiel SYSCOHADA — paie, comptabilité, liasse fiscale, recouvrement, restauration, tontine. Un seul socle, une seule connexion, zéro ressaisie.</p>
          <div className="cta-row fade">
            <a href="#suite" className="hb hb-primary mag">Découvrir la suite →</a>
            <Link to="/contact" className="hb hb-ghost mag">Demander une démo</Link>
          </div>
        </div>
        <aside className="live fade">
          <div className="lh"><span className="mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--hv-muted)" }}>SOCLE ATLAS</span>
            <span className="st"><b />OPÉRATIONNEL</span></div>
          <div className="row"><span>Modules actifs</span><b data-count="11">0</b></div>
          <div className="row"><span>États OHADA</span><b data-count="17">0</b></div>
          <div className="row"><span>Zones</span><b>UEMOA · CEMAC</b></div>
          <div className="row"><span>Socle</span><b>Supabase · 1</b></div>
        </aside>
        <div className="cue">SCROLL<i /></div>
      </section>

      {/* MARQUEE */}
      <div className="marq"><div className="track mt1">{marqSeg}{marqSeg}</div></div>
      <div className="marq r2"><div className="track mt2">{marqSeg}{marqSeg}</div></div>

      {/* MANIFESTO */}
      <section className="manif">
        <div className="halo2" />
        <div className="wrap">
          <p className="big ml">Onze logiciels. Un seul <span className="g">socle.</span> Zéro ressaisie.</p>
          <p className="tagline fade">De la première fiche de paie au dernier poste recouvré — une seule colonne vertébrale, un seul référentiel, toute l'Afrique de l'OHADA.</p>
        </div>
      </section>

      {/* CAPS */}
      <section className="caps">
        <div className="wrap">
          <h2 className="ml">Une plateforme, pas une pile d'outils.</h2>
          <p className="lead fade">Six principes de conception partagés par les onze logiciels.</p>
          <div className="body">
            <div className="rail"><em>01</em><i /></div>
            <div>{CAPS.map(([n, t, d]) => (
              <div className="cap" key={n}><div className="n">{n}</div>
                <div><h3 className="ml">{t}</h3><p>{d}</p></div></div>
            ))}</div>
          </div>
        </div>
      </section>

      {/* SUITE */}
      <section className="suite" id="suite">
        <div className="wrap">
          <div className="head"><h2 className="ml">La suite, module par module.</h2>
            <p className="mono fade" style={{ letterSpacing: ".14em", color: "var(--hv-muted)" }}>{apps.length} modules · filtrez &amp; survolez</p></div>
          <div className="filters">
            {FILTERS.map(([f, label]) => (
              <button key={f} className={filter === f ? "act" : ""} onClick={() => setFilter(f)}>{label}</button>
            ))}
          </div>
          <div className="grid">
            {apps.map((a, i) => {
              const hide = filter !== "all" && filter !== a.type;
              const Icon = a.Icon;
              return (
                <article className={"hcard" + (hide ? " hide" : "")} key={a.id} style={{ ["--dot" as any]: a.color, ["--i" as any]: i }}>
                  <div className="top"><span className="code">{a.code}</span><span className="tag">{a.type}</span></div>
                  <div className="nm"><span className="dot"><Icon size={18} strokeWidth={1.8} /></span><h3>{a.name}</h3></div>
                  <p>{a.tagline}</p>
                  <div className="go">Ouvrir le module →</div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* DUAL */}
      <section className="dual wrap">
        <Link className="panel lg mag" to="/contact"><div className="k">POUR COMMENCER</div><h3 className="ml">Voir Atlas Studio en action.</h3>
          <p>Une démo guidée sur vos cas réels — paie, clôture, liasse, recouvrement.</p><span className="arw">Demander une démo →</span></Link>
        <Link className="panel dk mag" to="/portal"><div className="k">DÉJÀ CLIENT</div><h3 className="ml">Accéder au portail.</h3>
          <p>Licences, factures, tickets et téléchargements — tout au même endroit.</p><span className="arw" style={{ color: "var(--hv-volt)" }}>Ouvrir le portail →</span></Link>
      </section>

      {/* FOOTER BAND */}
      <section className="fband">
        <div className="wrap">
          <div className="fbig" data-g="gestion.">Pilotez toute votre gestion.</div>
          <p className="fsub">Le système d'exploitation de la gestion africaine — onze logiciels, un seul socle.</p>
          <div className="fcta">
            <Link to="/applications" className="hb hb-primary mag">Explorer les modules →</Link>
            <Link to="/tarifs" className="hb hb-ghost mag" style={{ color: "#F4F4ED", borderColor: "rgba(244,244,237,.3)" }}>Voir les tarifs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
