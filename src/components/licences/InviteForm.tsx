import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useInvitations } from "../../hooks/useInvitations";
import type { SeatQuota } from "../../types/licences";

interface Props {
  licenceId: string;
  tenantId: string;
  quota: SeatQuota | null;
  onInvited: () => void;
}

const ROLES = [
  { value: "app_admin", label: "Administrateur" },
  { value: "editor", label: "Editeur" },
  { value: "viewer", label: "Lecteur" },
];

export function InviteForm({ licenceId, tenantId, quota, onInvited }: Props) {
  const { invite } = useInvitations();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("viewer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canInvite = quota ? quota.can_add : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Veuillez saisir une adresse email.");
      return;
    }

    if (quota && !quota.can_add) {
      setError("Quota de sieges atteint. Impossible d'inviter.");
      return;
    }

    setSending(true);
    try {
      await invite({
        licence_id: licenceId,
        tenant_id: tenantId,
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        role,
        send_email: true,
      });
      setEmail("");
      setFullName("");
      setRole("viewer");
      setSuccess(true);
      onInvited();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'invitation.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E8E8E0",
    color: "#1A1A1A",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="email"
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="text"
          placeholder="Nom complet (optionnel)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm" style={{ color: "#22C55E" }}>
          Invitation envoyee avec succes.
        </p>
      )}

      <button
        type="submit"
        disabled={sending || !canInvite}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={{
          background: canInvite ? "#EF9F27" : "#E8E8E0",
          color: canInvite ? "#FFFFFF" : "#888",
          cursor: canInvite && !sending ? "pointer" : "not-allowed",
          border: "none",
        }}
      >
        {sending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        Envoyer l'invitation
      </button>
    </form>
  );
}
