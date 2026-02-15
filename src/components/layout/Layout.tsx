import { createContext, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useSupabaseContent } from "../../hooks/useSupabaseContent";
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

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-center">
          <Logo size={36} color="text-neutral-light" />
          <p className="text-neutral-placeholder mt-3 text-sm">Chargement...</p>
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
