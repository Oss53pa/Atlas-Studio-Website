import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle, UserPlus, Users, Shield, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AdminInfo {
  company_name: string;
  licence_id: string;
  can_invite_users: boolean;
  can_manage_roles: boolean;
}

interface Seat {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
}

const ROLE_OPTIONS = ["viewer", "editor", "admin"];

export default function AdminAccessPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Role update
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const headers = {
    "Content-Type": "application/json",
    apikey: apiKey,
  };

  // Step 1: Validate admin link
  useEffect(() => {
    if (!token) return;

    const validate = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/functions/v1/validate-admin-link`, {
          method: "POST",
          headers,
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || "Lien administrateur invalide.");
        }

        setAdminInfo(data);
      } catch (err: any) {
        setError(err.message || "Impossible de valider le lien administrateur.");
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [token]);

  // Step 5: Fetch seats once admin info is available
  const fetchSeats = useCallback(async () => {
    if (!adminInfo?.licence_id || !token) return;

    setSeatsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/functions/v1/list-seats`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token, licence_id: adminInfo.licence_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du chargement des membres.");
      }

      setSeats(data.seats || []);
    } catch (err: any) {
      console.error("Failed to fetch seats:", err);
    } finally {
      setSeatsLoading(false);
    }
  }, [adminInfo, token]);

  useEffect(() => {
    if (adminInfo) {
      fetchSeats();
    }
  }, [adminInfo, fetchSeats]);

  // Step 6: Invite user
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("L'adresse email est requise.");
      return;
    }

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch(`${baseUrl}/functions/v1/invite-member`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          token,
          licence_id: adminInfo?.licence_id,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'invitation.");
      }

      setInviteSuccess(`Invitation envoyee a ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchSeats();
    } catch (err: any) {
      setInviteError(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setInviting(false);
    }
  };

  // Step 7: Update member role
  const handleRoleChange = async (seatId: string, newRole: string) => {
    setUpdatingRole(seatId);
    try {
      const res = await fetch(`${baseUrl}/functions/v1/update-member-role`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          token,
          licence_id: adminInfo?.licence_id,
          seat_id: seatId,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise a jour du role.");
      }

      setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, role: newRole } : s)));
    } catch (err: any) {
      console.error("Failed to update role:", err);
    } finally {
      setUpdatingRole(null);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-lg text-[#e5e5e5] text-sm outline-none focus:border-[#EF9F27] transition-colors placeholder:text-[#666]";

  const selectClass =
    "px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-lg text-[#e5e5e5] text-sm outline-none focus:border-[#EF9F27] transition-colors appearance-none cursor-pointer";

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#EF9F27] mx-auto mb-4" />
          <p className="text-[#999] text-sm">Validation du lien administrateur...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !adminInfo) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-8 max-w-md w-full text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-[#e5e5e5] text-lg font-medium mb-2">Acces refuse</h2>
          <p className="text-red-400 text-sm">{error || "Lien invalide ou expire."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#EF9F27] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A0A0A] text-lg font-bold">A</span>
          </div>
          <div>
            <h1 className="text-[#e5e5e5] text-xl font-medium">
              Espace administrateur — {adminInfo.company_name}
            </h1>
            <p className="text-[#666] text-xs">Atlas Studio</p>
          </div>
        </div>

        {/* Invite form */}
        {adminInfo.can_invite_users && (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={18} className="text-[#EF9F27]" />
              <h2 className="text-[#e5e5e5] text-base font-medium">Inviter un membre</h2>
            </div>

            {inviteSuccess && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {inviteSuccess}
              </div>
            )}
            {inviteError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {inviteError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@entreprise.com"
                  type="email"
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={selectClass + " pr-10"}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none"
                />
              </div>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-6 py-3 bg-[#EF9F27] hover:bg-[#d88f22] text-[#0A0A0A] font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {inviting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Envoi...
                  </>
                ) : (
                  "Inviter"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-[#EF9F27]" />
            <h2 className="text-[#e5e5e5] text-base font-medium">Membres</h2>
            <span className="text-[#666] text-xs ml-auto">{seats.length} membre{seats.length !== 1 ? "s" : ""}</span>
          </div>

          {seatsLoading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-[#EF9F27] mx-auto mb-2" />
              <p className="text-[#666] text-sm">Chargement...</p>
            </div>
          ) : seats.length === 0 ? (
            <p className="text-[#666] text-sm text-center py-8">Aucun membre pour le moment.</p>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {seats.map((seat) => (
                <div key={seat.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#EF9F27] text-xs font-medium">
                        {(seat.first_name?.[0] || seat.email[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#e5e5e5] text-sm truncate">
                        {seat.first_name && seat.last_name
                          ? `${seat.first_name} ${seat.last_name}`
                          : seat.email}
                      </p>
                      {seat.first_name && (
                        <p className="text-[#666] text-xs truncate">{seat.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {seat.status === "pending" && (
                      <span className="text-[10px] uppercase tracking-wider text-[#EF9F27] bg-[#EF9F27]/10 px-2 py-0.5 rounded">
                        En attente
                      </span>
                    )}

                    {adminInfo.can_manage_roles ? (
                      <div className="relative">
                        <select
                          value={seat.role}
                          onChange={(e) => handleRoleChange(seat.id, e.target.value)}
                          disabled={updatingRole === seat.id}
                          className="bg-[#141414] border border-[#2a2a2a] rounded text-[#e5e5e5] text-xs px-2 py-1.5 pr-7 outline-none focus:border-[#EF9F27] transition-colors appearance-none cursor-pointer disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                        {updatingRole === seat.id ? (
                          <Loader2
                            size={10}
                            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-[#EF9F27]"
                          />
                        ) : (
                          <ChevronDown
                            size={10}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-[#999] text-xs flex items-center gap-1">
                        <Shield size={12} />
                        {seat.role.charAt(0).toUpperCase() + seat.role.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[#444] text-xs mt-8">Atlas Studio</p>
      </div>
    </div>
  );
}
