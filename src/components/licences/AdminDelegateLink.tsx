import { useEffect, useState } from "react";
import { Copy, RefreshCw, Check, Shield, Loader2 } from "lucide-react";
import { useAdminDelegateLink } from "../../hooks/useAdminDelegateLink";

interface Props {
  licenceId: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  can_invite_users: "Inviter des utilisateurs",
  can_manage_roles: "Gerer les roles",
  can_view_users: "Voir les utilisateurs",
  can_revoke_users: "Revoquer des utilisateurs",
  can_view_billing: "Voir la facturation",
  can_change_plan: "Changer de plan",
};

export function AdminDelegateLink({ licenceId }: Props) {
  const { link, adminUrl, loading, fetchLink, generateLink } =
    useAdminDelegateLink(licenceId);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchLink();
  }, [fetchLink]);

  const handleCopy = async () => {
    if (!adminUrl) return;
    await navigator.clipboard.writeText(adminUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateLink();
    } catch {
      // silently handled
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 size={16} className="animate-spin" style={{ color: "#888" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Chargement...
        </span>
      </div>
    );
  }

  const permissions = link
    ? Object.entries(PERMISSION_LABELS).filter(
        ([key]) => link[key as keyof typeof link] === true
      )
    : [];

  return (
    <div className="space-y-4">
      {adminUrl ? (
        <>
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid #E8E8E0" }}
          >
            <input
              readOnly
              value={adminUrl}
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: "#1A1A1A" }}
            />
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg transition-colors"
              style={{ color: copied ? "#22C55E" : "#888" }}
              title="Copier le lien"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          {link?.expires_at && (
            <p className="text-xs" style={{ color: "#888" }}>
              Expire le{" "}
              {new Date(link.expires_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {permissions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {permissions.map(([key, label]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: "#FAFAF7",
                    border: "1px solid #E8E8E0",
                    color: "#1A1A1A",
                  }}
                >
                  <Shield size={12} style={{ color: "#EF9F27" }} />
                  {label}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: "#888" }}>
          Aucun lien actif.
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E8E0",
          color: "#1A1A1A",
          cursor: generating ? "not-allowed" : "pointer",
        }}
      >
        {generating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {adminUrl ? "Regenerer le lien" : "Generer un lien"}
      </button>
    </div>
  );
}
