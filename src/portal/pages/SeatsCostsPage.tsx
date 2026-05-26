import { Fragment, useEffect, useMemo, useState } from "react";
import { Wallet, Users, Loader2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useLicences } from "../../hooks/useLicences";
import { supabase } from "../../lib/supabase";
import { ROLE_LABELS, type LicenceSeat } from "../../types/licences";
import type { SeatPlanConfig } from "../../lib/utils";

const ACTIVE_SUB = new Set(["active", "trialing", "trial"]);
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

interface CostRow {
  appId: string;
  appName: string;
  plan: string;
  bundle: string | null;
  currency: string;
  period: string;
  mode: "forfait_seats" | "per_person" | "flat";
  base: number;
  included: number;
  purchased: number;
  used: number;
  extraSeats: number;
  extraUnit: number;
  extraCost: number;
  total: number;
  billed: number;
  members: LicenceSeat[];
}

export function SeatsCostsPage({ userId }: { userId?: string }) {
  const { profile } = useAuth();
  const tenantId = (profile as any)?.tenant_id as string | undefined;
  const { subscriptions, loading: subsLoading } = useSubscriptions(userId);
  const { appMap, loading: appsLoading } = useAppCatalog();
  const { licences, loading: licLoading } = useLicences(tenantId);
  const [seats, setSeats] = useState<LicenceSeat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) { setSeatsLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("licence_seats")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (!cancelled) { setSeats((data as unknown as LicenceSeat[]) || []); setSeatsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  const loading = subsLoading || appsLoading || licLoading || seatsLoading;

  const licenceBySlug = useMemo(() => {
    const m: Record<string, (typeof licences)[number]> = {};
    for (const l of licences) if (l.products?.slug) m[l.products.slug] = l;
    return m;
  }, [licences]);

  const seatsByLicence = useMemo(() => {
    const m: Record<string, LicenceSeat[]> = {};
    for (const s of seats) (m[s.licence_id] ??= []).push(s);
    return m;
  }, [seats]);

  const rows = useMemo<CostRow[]>(() => {
    return subscriptions
      .filter(s => ACTIVE_SUB.has(s.status))
      .map(sub => {
        const app = appMap[sub.app_id] as any;
        const plan = sub.plan as string;
        const pricing = (app?.pricing || {}) as Record<string, number>;
        const cfg = ((app?.seat_pricing || {}) as Record<string, SeatPlanConfig>)[plan];
        const base = pricing[plan] ?? Number(sub.price_at_subscription) ?? 0;
        const licence = licenceBySlug[sub.app_id];
        const members = (licence ? seatsByLicence[licence.id] || [] : []).filter(s => s.status !== "revoked");
        const used = licence?.used_seats ?? members.length ?? (sub as any).seats_used ?? 0;
        const mode = (cfg?.mode || "flat") as CostRow["mode"];

        let included = 0, purchased = (sub as any).seats_limit ?? 0, extraSeats = 0, extraUnit = 0, extraCost = 0, total = base;
        if (mode === "forfait_seats") {
          included = cfg?.included ?? 0;
          purchased = (sub as any).seats_limit ?? included;
          extraUnit = cfg?.extra ?? 0;
          extraSeats = Math.max(0, purchased - included);
          extraCost = extraSeats * extraUnit;
          total = base + extraCost;
        } else if (mode === "per_person") {
          const rate = cfg?.rate ?? base;
          purchased = (sub as any).seats_limit ?? cfg?.min ?? members.length ?? 1;
          extraUnit = rate;
          total = rate * purchased;
        } else {
          purchased = (sub as any).seats_limit ?? 1;
          total = base;
        }

        return {
          appId: sub.app_id, appName: app?.name || sub.app_id, plan,
          bundle: (sub as any).bundle_slug ?? null,
          currency: app?.currency || "FCFA",
          period: app?.pricing_period || "mois",
          mode, base, included, purchased, used, extraSeats, extraUnit, extraCost, total,
          billed: Number((sub as any).price_at_subscription) || total,
          members,
        };
      });
  }, [subscriptions, appMap, licenceBySlug, seatsByLicence]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalUsers = new Set(seats.filter(s => s.status !== "revoked").map(s => s.user_id || s.email)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Sièges &amp; coûts</h1>
      <p className="text-neutral-muted text-sm mb-7">
        Vue transparente : pour chaque application, ce que vous payez, vos utilisateurs et le coût des sièges supplémentaires.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-neutral-muted text-xs font-semibold uppercase tracking-wider mb-1"><Wallet size={14} className="text-gold" /> Total mensuel</div>
          <div className="text-gold text-2xl font-extrabold">{fmt(grandTotal)} <span className="text-neutral-placeholder text-sm font-medium">FCFA/mois</span></div>
        </div>
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-neutral-muted text-xs font-semibold uppercase tracking-wider mb-1"><Package size={14} className="text-gold" /> Applications</div>
          <div className="text-neutral-text text-2xl font-extrabold">{rows.length}</div>
        </div>
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-neutral-muted text-xs font-semibold uppercase tracking-wider mb-1"><Users size={14} className="text-gold" /> Utilisateurs</div>
          <div className="text-neutral-text text-2xl font-extrabold">{totalUsers}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-warm-border rounded-2xl">
          <p className="text-neutral-muted">Aucun abonnement actif pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-warm-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-muted text-left bg-warm-bg/60">
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-right">Base</th>
                <th className="px-4 py-3 font-medium text-center">Sièges (utilisés / payés)</th>
                <th className="px-4 py-3 font-medium text-right">Sièges suppl.</th>
                <th className="px-4 py-3 font-medium text-right">Total /mois</th>
                <th className="px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isOpen = expanded === r.appId;
                return (
                  <Fragment key={r.appId}>
                    <tr
                      className="border-t border-warm-border cursor-pointer hover:bg-warm-bg/40"
                      onClick={() => setExpanded(isOpen ? null : r.appId)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-text flex items-center gap-2">
                          {r.appName}
                          {r.bundle && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Suite</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-body">{r.plan}</td>
                      <td className="px-4 py-3 text-right text-neutral-body">
                        {fmt(r.base)} <span className="text-neutral-placeholder text-[11px]">{r.currency}/{r.period}</span>
                        {r.mode === "per_person" && <div className="text-neutral-placeholder text-[10px]">par personne</div>}
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-body">
                        <span className="font-semibold">{r.used}</span> / {r.purchased}
                        {r.mode === "forfait_seats" && <div className="text-neutral-placeholder text-[10px]">{r.included} inclus</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-body">
                        {r.mode === "forfait_seats" && r.extraSeats > 0
                          ? <span>{r.extraSeats} × {fmt(r.extraUnit)} = <span className="font-semibold text-neutral-text">{fmt(r.extraCost)}</span></span>
                          : r.mode === "per_person"
                          ? <span className="text-neutral-placeholder">{r.purchased} × {fmt(r.extraUnit)}</span>
                          : <span className="text-neutral-placeholder">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-gold">{fmt(r.total)}</td>
                      <td className="px-4 py-3 text-neutral-muted">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-warm-bg/30">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="text-neutral-muted text-xs font-semibold uppercase tracking-wider mb-2">
                            Utilisateurs ({r.members.length})
                          </div>
                          {r.members.length === 0 ? (
                            <p className="text-neutral-placeholder text-[13px] py-2">Aucun utilisateur n'occupe encore de siège sur cette application.</p>
                          ) : (
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="text-neutral-placeholder text-left">
                                  <th className="py-1.5 font-medium">Email</th>
                                  <th className="py-1.5 font-medium">Nom</th>
                                  <th className="py-1.5 font-medium">Rôle</th>
                                  <th className="py-1.5 font-medium text-right">Coût du siège /mois</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.members.map((m, idx) => {
                                  let cost: string;
                                  if (r.mode === "per_person") cost = `${fmt(r.extraUnit)} ${r.currency}`;
                                  else if (r.mode === "forfait_seats") cost = idx < r.included ? "Inclus" : `+${fmt(r.extraUnit)} ${r.currency}`;
                                  else cost = "Inclus";
                                  return (
                                    <tr key={m.id} className="border-t border-warm-border/60">
                                      <td className="py-1.5 text-neutral-body">{m.email}</td>
                                      <td className="py-1.5 text-neutral-body">{m.full_name || "—"}</td>
                                      <td className="py-1.5 text-neutral-muted">{ROLE_LABELS[m.role] ?? m.role}</td>
                                      <td className="py-1.5 text-right text-neutral-body">{cost}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                          <p className="text-neutral-placeholder text-[11px] mt-3">
                            Facturé à la souscription : <span className="font-semibold">{fmt(r.billed)} {r.currency}/{r.period}</span>
                            {r.mode === "forfait_seats" && ` · forfait socle ${fmt(r.base)} + ${r.extraSeats} siège(s) suppl.`}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-warm-border bg-warm-bg/60">
                <td className="px-4 py-3 font-bold text-neutral-text" colSpan={5}>Total mensuel</td>
                <td className="px-4 py-3 text-right font-extrabold text-gold text-base">{fmt(grandTotal)} FCFA</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
