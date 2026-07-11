/**
 * WelcomePage.tsx — /portal/welcome
 *
 * Landing affichee apres creation de mot de passe (flux invite/signup).
 * Liste les apps auxquelles l'utilisateur a un acces actif (subscription
 * active ou trial) et propose de les lancer immediatement via /portal/launch.
 *
 * Brief 2026-05-07 — Phase 1.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import type { Subscription } from "../../lib/database.types";

interface AccessibleApp {
  app_id: string;
  app_name: string;
  app_color: string;
  status: string;
  trial_ends_at: string | null;
}

export default function WelcomePage() {
  const { profile, user } = useAuth();
  const { appMap } = useAppCatalog();
  const [accessibleApps, setAccessibleApps] = useState<AccessibleApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("app_id, status, trial_ends_at")
        .eq("user_id", user!.id)
        .in("status", ["active", "trial"]);
      if (cancelled) return;
      if (error) {
        console.error("WelcomePage load error", error);
        setLoading(false);
        return;
      }
      const subs = (data ?? []) as Subscription[];
      setAccessibleApps(subs.map(s => ({
        app_id: s.app_id,
        app_name: appMap[s.app_id]?.name || s.app_id,
        app_color: (appMap[s.app_id] as any)?.color || "var(--c-accent)",
        status: s.status,
        trial_ends_at: s.trial_ends_at,
      })));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, appMap]);

  const firstName = (profile?.full_name || "").split(" ")[0] || profile?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-onyx text-neutral-light flex items-center justify-center px-5 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-5">
            <Sparkles size={26} className="text-emerald-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl md:text-4xl font-medium text-gradient-light tracking-tight mb-3">
            Bienvenue{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-neutral-muted text-[15px] font-light max-w-md mx-auto leading-relaxed">
            Votre compte Atlas Studio est actif. Lancez l'une de vos applications pour commencer.
          </p>
        </div>

        {/* Apps */}
        <div className="bg-ink-100 border border-white/[0.06] rounded-3xl p-6 md:p-8 mb-6 shadow-elev-3">
          <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.14em] mb-4">
            Vos applications
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gold" />
            </div>
          ) : accessibleApps.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-muted text-sm mb-5">
                Aucune application active pour l'instant.
              </p>
              <Link to="/portal" className="btn-gold !px-5 !py-2.5 !text-[13px] inline-flex">
                Decouvrir le catalogue <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {accessibleApps.map(app => {
                const isTrial = app.status === "trial";
                const daysLeft = app.trial_ends_at
                  ? Math.max(0, Math.ceil((new Date(app.trial_ends_at).getTime() - Date.now()) / 86_400_000))
                  : null;
                return (
                  <Link
                    key={app.app_id}
                    to={`/portal/launch?appId=${encodeURIComponent(app.app_id)}`}
                    className="flex items-center gap-4 p-4 rounded-2xl surface-raised hover:border-gold/30 hover:-translate-y-0.5 dark:hover:shadow-elev-3 transition-all duration-300 group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--c-bg)] text-sm font-bold flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                      style={{ backgroundColor: app.app_color }}
                    >
                      {app.app_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-light font-medium truncate">{app.app_name}</div>
                      <div className="mt-1.5">
                        {isTrial ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.02em] bg-amber-500/[0.12] text-amber-300 border border-amber-500/25">
                            Trial — {daysLeft !== null ? `${daysLeft}j restants` : "actif"}
                          </span>
                        ) : (
                          <span className="pill">Acces actif</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-neutral-muted group-hover:text-gold transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[13px]">
          <Link to="/portal" className="text-neutral-muted hover:text-gold transition-colors">
            Tableau de bord portail
          </Link>
          <span className="text-neutral-muted/40">·</span>
          <Link to="/portal" className="text-neutral-muted hover:text-gold transition-colors">
            Catalogue d'applications
          </Link>
          <span className="text-neutral-muted/40">·</span>
          <Link to="/portal" className="text-neutral-muted hover:text-gold transition-colors">
            Mon profil
          </Link>
        </div>
      </div>
    </div>
  );
}
