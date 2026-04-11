import { Navigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <ShieldOff size={26} className="text-red-400" />
          </div>
          <h2 className="text-white dark:text-admin-text text-xl font-bold mb-2">
            Accès restreint
          </h2>
          <p className="text-white/50 dark:text-admin-muted text-sm leading-relaxed">
            Cette section est réservée au <strong className="text-[#EF9F27]">Super Admin</strong>.
            Seule Pamela peut gérer les administrateurs et leurs accès.
          </p>
          <p className="text-white/30 dark:text-admin-muted/60 text-[11px] mt-4">
            Si vous pensez qu'il s'agit d'une erreur, contactez Pamela.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
