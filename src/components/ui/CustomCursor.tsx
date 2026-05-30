// Atlas Studio — Curseur signature.
//
// Deux couches : un point dur olive qui suit instantanément, et un anneau plus
// large qui suit en eased follow. Au survol d'un élément interactif (a, button,
// [data-cursor], inputs), l'anneau s'élargit et révèle un label mono. Sur les
// écrans tactiles (pointer: coarse), rien n'est rendu — le système reste sain.
//
// L'attribut `data-cursor="…"` posé sur n'importe quel élément définit le label
// révélé à droite de l'anneau (ex: "Souscrire", "OHADA · 17 pays", "Survol").

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Pointer fine seulement (souris/trackpad), pas tactile.
    const mql = window.matchMedia("(pointer: fine)");
    if (!mql.matches) return;

    document.documentElement.classList.add("atlas-cursor-active");

    const target = { x: -50, y: -50 };
    const ring = { x: -50, y: -50 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return;
      const hot = t.closest<HTMLElement>(
        "a, button, [data-cursor], input, textarea, select, label, summary",
      );
      if (hot) {
        const label = hot.getAttribute("data-cursor") || "";
        if (labelRef.current) labelRef.current.textContent = label;
        ringRef.current?.classList.add("atlas-cursor-hover");
        if (label) ringRef.current?.classList.add("atlas-cursor-labeled");
      } else {
        ringRef.current?.classList.remove("atlas-cursor-hover");
        ringRef.current?.classList.remove("atlas-cursor-labeled");
      }
    };

    const onDown = () => ringRef.current?.classList.add("atlas-cursor-press");
    const onUp   = () => ringRef.current?.classList.remove("atlas-cursor-press");

    const onLeave = () => {
      if (dotRef.current)  dotRef.current.style.opacity  = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current)  dotRef.current.style.opacity  = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    const tick = () => {
      // Eased follow pour l'anneau ; le point suit instantanément.
      ring.x += (target.x - ring.x) * 0.22;
      ring.y += (target.y - ring.y) * 0.22;
      if (dotRef.current)  dotRef.current.style.transform  = `translate3d(${target.x}px, ${target.y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    document.addEventListener("pointermove", onMove,  { passive: true });
    document.addEventListener("pointerover", onOver,  { passive: true });
    document.addEventListener("pointerdown", onDown,  { passive: true });
    document.addEventListener("pointerup",   onUp,    { passive: true });
    document.addEventListener("mouseleave",  onLeave);
    document.addEventListener("mouseenter",  onEnter);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup",   onUp);
      document.removeEventListener("mouseleave",  onLeave);
      document.removeEventListener("mouseenter",  onEnter);
      document.documentElement.classList.remove("atlas-cursor-active");
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="atlas-cursor-dot"  aria-hidden />
      <div ref={ringRef} className="atlas-cursor-ring" aria-hidden>
        {/* Petits repères à 12, 3, 6, 9 h pour un look "viseur" */}
        <span className="atlas-cursor-tick atlas-cursor-tick-n" />
        <span className="atlas-cursor-tick atlas-cursor-tick-e" />
        <span className="atlas-cursor-tick atlas-cursor-tick-s" />
        <span className="atlas-cursor-tick atlas-cursor-tick-w" />
        <span ref={labelRef} className="atlas-cursor-label" />
      </div>
    </>
  );
}
