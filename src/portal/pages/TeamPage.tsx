import { useState } from "react";
import {
  Users,
  Shield,
  Key,
  Loader2,
  UserMinus,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useLicences } from "../../hooks/useLicences";
import { useSeats } from "../../hooks/useSeats";
import { supabase } from "../../lib/supabase";
import { SeatQuotaBar } from "../../components/licences/SeatQuotaBar";
import { SeatQuotaAlert } from "../../components/licences/SeatQuotaAlert";
import { InviteForm } from "../../components/licences/InviteForm";
import { AdminDelegateLink } from "../../components/licences/AdminDelegateLink";
import {
  ROLE_LABELS,
  STATUS_LABELS,
  type LicenceSeat,
} from "../../types/licences";

/* ── design tokens ── */
const BG = "#FAFAF7";
const SURFACE = "#FFFFFF";
const ACCENT = "#EF9F27";
const TEXT = "#1A1A1A";
const MUTED = "#888";
const BORDER = "#E8E8E0";

export function TeamPage({ userId }: { userId?: string }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { licences, loading: licLoading } = useLicences(tenantId);
  const [selectedLicenceId, setSelectedLicenceId] = useState<string | null>(null);

  const activeLicences = licences.filter(
    (l) => l.status === "active" || l.status === "pending"
  );

  /* auto-select first licence once loaded */
  const effectiveLicenceId = selectedLicenceId ?? activeLicences[0]?.id ?? "";

  if (licLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (activeLicences.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={48} strokeWidth={1.5} style={{ color: MUTED }} className="mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2" style={{ color: TEXT }}>
          Aucune licence active
        </h2>
        <p className="text-sm" style={{ color: MUTED }}>
          Activez une licence pour gerer votre equipe.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>
        Licence & Equipe
      </h1>
      <p className="text-sm mb-8" style={{ color: MUTED }}>
        Gerez vos licences, membres et delegations d'acces
      </p>

      {/* ── Licence picker (if multiple) ── */}
      {activeLicences.length > 1 && (
        <div className="mb-6">
          <label className="text-xs font-medium mb-1 block" style={{ color: MUTED }}>
            Licence
          </label>
          <div className="relative inline-block">
            <select
              value={effectiveLicenceId}
              onChange={(e) => setSelectedLicenceId(e.target.value)}
              className="appearance-none pr-8 pl-4 py-2 rounded-xl text-sm font-medium outline-none cursor-pointer"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
            >
              {activeLicences.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.products?.name ?? l.product_id} &mdash; {l.plans?.name ?? l.plan_id}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
          </div>
        </div>
      )}

      {/* ── Licence cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {activeLicences.map((lic) => {
          const statusConf = STATUS_LABELS[lic.status] ?? STATUS_LABELS.expired;
          return (
            <div
              key={lic.id}
              className="p-5 rounded-2xl cursor-pointer transition-shadow"
              style={{
                background: SURFACE,
                border: `1px solid ${lic.id === effectiveLicenceId ? ACCENT : BORDER}`,
                boxShadow: lic.id === effectiveLicenceId ? `0 0 0 2px ${ACCENT}33` : "none",
              }}
              onClick={() => setSelectedLicenceId(lic.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-bold" style={{ color: TEXT }}>
                  {lic.products?.name ?? lic.product_id}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${statusConf.color}18`, color: statusConf.color }}
                >
                  {statusConf.label}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: MUTED }}>
                Plan {lic.plans?.name ?? lic.plan_id}
              </p>
              <SeatQuotaBar used={lic.used_seats} max={lic.max_seats} />
              {lic.expires_at && (
                <p className="text-xs mt-2" style={{ color: MUTED }}>
                  Expire le{" "}
                  {new Date(lic.expires_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Detail for selected licence ── */}
      {effectiveLicenceId && (
        <LicenceDetail
          licenceId={effectiveLicenceId}
          tenantId={tenantId!}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ */

function LicenceDetail({ licenceId, tenantId }: { licenceId: string; tenantId: string }) {
  const { seats, quota, loading, fetchSeats, fetchQuota } = useSeats(licenceId);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const handleRoleChange = async (seat: LicenceSeat, newRole: string) => {
    setChangingRole(seat.id);
    await supabase
      .from("licence_seats")
      .update({ role: newRole })
      .eq("id", seat.id);
    await fetchSeats();
    setChangingRole(null);
  };

  const handleRevoke = async (seat: LicenceSeat) => {
    if (!confirm(`Revoquer l'acces de ${seat.email} ?`)) return;
    await supabase
      .from("licence_seats")
      .update({ status: "revoked" })
      .eq("id", seat.id);
    fetchSeats();
    fetchQuota();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <Loader2 size={16} className="animate-spin" style={{ color: MUTED }} />
        <span className="text-sm" style={{ color: MUTED }}>Chargement des membres...</span>
      </div>
    );
  }

  const activeSeats = seats.filter((s) => s.status !== "revoked");

  return (
    <div className="space-y-8">
      {/* Quota alert */}
      <SeatQuotaAlert quota={quota} />

      {/* ── Members table ── */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4" style={{ color: TEXT }}>
          <Users size={20} style={{ color: ACCENT }} /> Membres ({activeSeats.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${BORDER}` }}>
          <table className="w-full text-sm" style={{ background: SURFACE }}>
            <thead>
              <tr style={{ background: BG, color: MUTED }}>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-left px-4 py-3 font-medium">Derniere connexion</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeSeats.map((seat) => {
                const sStatus = STATUS_LABELS[seat.status];
                return (
                  <tr
                    key={seat.id}
                    className="transition-colors"
                    style={{ borderTop: `1px solid ${BORDER}` }}
                  >
                    <td className="px-4 py-3" style={{ color: TEXT }}>{seat.email}</td>
                    <td className="px-4 py-3" style={{ color: TEXT }}>{seat.full_name || "---"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={seat.role}
                        onChange={(e) => handleRoleChange(seat, e.target.value)}
                        disabled={changingRole === seat.id}
                        className="bg-transparent outline-none text-sm cursor-pointer"
                        style={{ color: TEXT }}
                      >
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${sStatus?.color ?? MUTED}18`, color: sStatus?.color ?? MUTED }}
                      >
                        {sStatus?.label ?? seat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {seat.last_login
                        ? new Date(seat.last_login).toLocaleDateString("fr-FR")
                        : "Jamais"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevoke(seat)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: "#DC2626" }}
                        title="Revoquer"
                      >
                        <UserMinus size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {activeSeats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: MUTED }}>
                    Aucun membre pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invite form ── */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4" style={{ color: TEXT }}>
          <Key size={20} style={{ color: ACCENT }} /> Inviter un membre
        </h2>
        <InviteForm
          licenceId={licenceId}
          tenantId={tenantId}
          quota={quota}
          onInvited={() => { fetchSeats(); fetchQuota(); }}
        />
      </section>

      {/* ── Admin delegate link ── */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4" style={{ color: TEXT }}>
          <Shield size={20} style={{ color: ACCENT }} /> Lien d'acces administrateur
        </h2>
        <p className="text-sm mb-4" style={{ color: MUTED }}>
          Generez un lien temporaire pour deleguer l'administration de cette licence.
        </p>
        <AdminDelegateLink licenceId={licenceId} />
      </section>
    </div>
  );
}
