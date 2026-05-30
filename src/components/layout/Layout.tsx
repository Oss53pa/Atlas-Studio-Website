import { createContext, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useSupabaseContent } from "../../hooks/useSupabaseContent";
import { useAnalytics } from "../../hooks/useAnalytics";
import { Logo } from "../ui/Logo";
import { CustomCursor } from "../ui/CustomCursor";
import { AdinkraGlyph, WovenDivider } from "../ornaments";
import type { SiteContent } from "../../config/content";

interface ContentContextValue {
  content: SiteContent;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function useContentContext() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContentContext must be used within Layout");
  return ctx;
}

export function Layout() {
  const { content, loaded } = useSupabaseContent();
  const location = useLocation();
  useAnalytics();

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] glow-gold opacity-60 pointer-events-none" />
        <div className="relative text-center px-8">
          {/* Glyphe signature en haut */}
          <div className="mb-6 flex justify-center text-[#A9B57E]/70">
            <AdinkraGlyph name="spiral" size={32} />
          </div>
          <Logo size={36} color="text-gradient-gold" />
          {/* Séparateur tissé fin */}
          <div className="mt-6 mb-4 w-[220px] mx-auto">
            <WovenDivider weaveCells={7} />
          </div>
          <p className="meta-mono text-[10px] tracking-[0.28em] uppercase text-neutral-light/45">
            Chargement · Atlas Studio
          </p>
        </div>
      </div>
    );
  }

  return (
    <ContentContext.Provider value={{ content }}>
      <CustomCursor />
      <Navbar />
      <main key={location.pathname} className="animate-page-enter">
        <Outlet />
      </main>
      <Footer />
    </ContentContext.Provider>
  );
}
