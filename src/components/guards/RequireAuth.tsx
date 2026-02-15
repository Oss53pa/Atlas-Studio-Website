import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
