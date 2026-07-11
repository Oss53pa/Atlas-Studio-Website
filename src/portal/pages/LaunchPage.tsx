/**
 * LaunchPage.tsx — /portal/launch?appId=...
 *
 * Utilitaire de redirection : appelle l'edge function app-token pour generer
 * un JWT signe, puis redirige vers le subdomain de l'app cible avec le token
 * en query param. L'app cible (cockpit-fa, atlas-fna, etc.) le valide via
 * sa propre route /auth + edge function atlas-sso.
 *
 * Brief 2026-05-07 — Phase 1.
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { apiCall } from "../../lib/api";

interface AppTokenResponse {
  token: string;
  redirectUrl: string;
}

export default function LaunchPage() {
  const [params] = useSearchParams();
  const appId = params.get("appId");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) {
      setError("Parametre `appId` manquant dans l'URL.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await apiCall<AppTokenResponse>("app-token", {
          method: "POST",
          body: { appId },
        });
        if (cancelled) return;
        if (!data.redirectUrl) {
          throw new Error("Reponse incomplete : redirectUrl manquant.");
        }
        // Redirection plein ecran (pas de nouvel onglet — on quitte le portal).
        window.location.href = data.redirectUrl;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Impossible de generer le lien d'acces.");
      }
    })();

    return () => { cancelled = true; };
  }, [appId]);

  return (
    <div className="min-h-screen bg-onyx text-neutral-light flex items-center justify-center px-5 py-12">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mb-5">
              <AlertTriangle size={22} className="text-red-700" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-medium text-neutral-light mb-2">
              Lancement impossible
            </h1>
            <p className="text-neutral-muted text-sm leading-relaxed mb-6">{error}</p>
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.10] text-neutral-muted text-[13px] font-medium hover:border-gold/40 hover:text-gold transition-colors"
            >
              <ArrowLeft size={14} /> Retour au portail
            </Link>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold/30 mb-5">
              <Loader2 size={22} className="text-gold animate-spin" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-medium text-neutral-light mb-2">
              Lancement de l'application…
            </h1>
            <p className="text-neutral-muted text-sm">
              {appId ? `Connexion securisee a ${appId}` : "Preparation"} en cours.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
