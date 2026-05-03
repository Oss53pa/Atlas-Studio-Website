import { createContext, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useSupabaseContent } from "../../hooks/useSupabaseContent";
import { useAnalytics } from "../../hooks/useAnalytics";
import { Logo } from "../ui/Logo";
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
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative text-center">
          <Logo size={40} color="text-gradient-gold" />
          <div className="mt-5 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
          <p className="text-neutral-muted/70 mt-3 text-xs font-light tracking-wide">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ContentContext.Provider value={{ content }}>
      <Navbar />
      <main key={location.pathname} className="animate-page-enter">
        <Outlet />
      </main>
      <Footer />
    </ContentContext.Provider>
  );
}
