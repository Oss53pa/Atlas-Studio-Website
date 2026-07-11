import { StrictMode, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { initErrorMonitor, AtlasErrorBoundary } from './lib/error-sdk';
import { Layout } from './components/layout/Layout';
import { ScrollToTop } from './components/layout/RouteHelpers';
import HomePage from './pages/HomePage';
import ApplicationsPage from './pages/ApplicationsPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import LegalNoticePage from './pages/LegalNoticePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import NotFoundPage from './pages/NotFoundPage';
import Portal from './portal/Portal';
import './i18n';
import './index.css';

// La console d'administration a été extraite dans un projet indépendant
// (github.com/Oss53pa/Atlas-studio-Console-Admin, déployée sur Vercel),
// reliée au même backend Supabase. Le site vitrine ne sert plus /admin.
const InvitePage = lazy(() => import('./pages/InvitePage'));
const AdminAccessPage = lazy(() => import('./pages/AdminAccessPage'));

const ATLAS_APP_ID = 'atlas-studio';

// Silently swallow AbortError unhandled rejections.
// These happen when a fetch (often from supabase-js) is cancelled because
// the user navigated away mid-request — it's expected, not a real error.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isAbort =
      (reason instanceof DOMException && reason.name === 'AbortError') ||
      (reason && typeof reason === 'object' &&
        ((reason as { name?: string }).name === 'AbortError' ||
          String((reason as { message?: string }).message || '').includes('signal is aborted')));
    if (isAbort) {
      event.preventDefault();
    }
  });
}

initErrorMonitor(ATLAS_APP_ID);

// ── Service Worker DÉSACTIVÉ (kill-switch) ────────────────────────────
// Historique houleux : boucle infinie de reloads, puis "double login" —
// l'auto-reload ~2s après chargement (updateSW(true)) interrompait la
// connexion et obligeait à se reconnecter / rafraîchir deux fois.
// La console admin n'a PAS besoin de mode offline. On NE réenregistre plus
// aucun SW et on DÉSENREGISTRE proprement ceux déjà installés + on purge les
// caches, pour que les clients existants reviennent à un état réseau-direct
// sain (fini le vieux build servi en cache → fini le double login).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => void r.unregister()))
    .catch(() => { /* ignore */ });
  if ('caches' in window) {
    caches.keys()
      .then((keys) => keys.forEach((k) => void caches.delete(k)))
      .catch(() => { /* ignore */ });
  }
}

// Cache le Root sur l'élément pour éviter de re-créer une racine React
// pendant le HMR (Vite réexécute main.tsx). Sans ce cache, React émet le
// warning "createRoot() on a container that has already been passed".
interface RootContainer extends HTMLElement {
  __reactRoot?: Root;
}
const container = document.getElementById('root')! as RootContainer;
const root: Root = container.__reactRoot ?? createRoot(container);
container.__reactRoot = root;
root.render(
  <StrictMode>
    <AtlasErrorBoundary appId={ATLAS_APP_ID}>
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Site vitrine — wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/mentions-legales" element={<LegalNoticePage />} />
            <Route path="/cgu" element={<TermsPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
          </Route>

          {/* Portal — login public, rest protected */}
          <Route path="/portal/*" element={<Portal />} />

          {/* La console d'administration (/admin) a été extraite dans un projet
              indépendant, relié au même Supabase. Le site ne la sert plus. */}

          {/* Public pages — invitation & admin access */}
          <Route path="/invite/:token" element={<Suspense fallback={<div />}><InvitePage /></Suspense>} />
          <Route path="/admin-access/:token" element={<Suspense fallback={<div />}><AdminAccessPage /></Suspense>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
    </AtlasErrorBoundary>
  </StrictMode>
);
