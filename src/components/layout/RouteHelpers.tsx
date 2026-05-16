import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset scroll position to top on every route change.
 * Mount once at router root.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Lightweight fallback shown by React.Suspense while lazy admin pages load.
 */
export function AdminLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-neutral-muted text-sm">Chargement...</div>
    </div>
  );
}
