import { Link, useLocation } from 'react-router-dom';
import { Layers } from 'lucide-react';
import type { AppRow } from '../../../lib/database.types';

interface ErrorMonitorNavProps {
  apps: AppRow[];
  loading?: boolean;
  /** Slug sélectionné, ou undefined pour "Toutes les apps" */
  currentAppSlug?: string;
}

export function ErrorMonitorNav({ apps, loading, currentAppSlug }: ErrorMonitorNavProps) {
  const location = useLocation();
  const isGlobal = !currentAppSlug && location.pathname === '/admin/error-monitor';

  return (
    <nav className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl p-2 mb-6 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        <Link
          to="/admin/error-monitor"
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
            isGlobal
              ? 'bg-gold dark:bg-admin-accent text-black'
              : 'text-neutral-body dark:text-admin-text hover:bg-warm-bg dark:hover:bg-admin-surface-alt'
          }`}
        >
          <Layers size={14} strokeWidth={1.8} />
          Toutes les apps
        </Link>

        <span className="mx-1 h-6 w-px bg-warm-border dark:bg-admin-surface-alt" aria-hidden="true" />

        {loading && apps.length === 0 ? (
          <span className="text-[11px] text-neutral-muted dark:text-admin-muted px-3">
            Chargement…
          </span>
        ) : (
          apps.map(app => {
            const active = currentAppSlug === app.id;
            return (
              <Link
                key={app.id}
                to={`/admin/error-monitor/${app.id}`}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-gold dark:bg-admin-accent text-black'
                    : 'text-neutral-body dark:text-admin-text hover:bg-warm-bg dark:hover:bg-admin-surface-alt'
                }`}
                title={app.name}
              >
                {/* Icône monochrome (lettre initiale dans un rond) — pas d'emoji couleur */}
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                    active
                      ? 'bg-black/10 text-black'
                      : 'bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted'
                  }`}
                  aria-hidden="true"
                >
                  {app.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="whitespace-nowrap">{app.name}</span>
              </Link>
            );
          })
        )}
      </div>
    </nav>
  );
}
