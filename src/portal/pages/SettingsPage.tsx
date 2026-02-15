import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [company, setCompany] = useState(profile?.company_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, company_name: company, phone, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setToast("Erreur lors de la sauvegarde");
    } else {
      setToast("Profil mis à jour avec succès");
      await refreshProfile();
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Paramètres</h1>
      <p className="text-neutral-muted text-sm mb-7">Gérez votre compte</p>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium max-w-md">
          {toast}
        </div>
      )}

      <div className="bg-white border border-warm-border rounded-2xl p-7 max-w-md mb-5">
        <h3 className="text-neutral-text text-base font-bold mb-5">Informations du compte</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Nom complet</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Email</label>
            <input
              value={profile?.email || ""}
              readOnly
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-muted text-sm outline-none cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Entreprise</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Téléphone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+225 XX XX XX XX"
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-gold mt-6 !py-2.5 !text-[13px]">
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>

      <div className="bg-white border border-red-200 rounded-2xl p-7 max-w-md">
        <h3 className="text-red-600 text-base font-bold mb-2">Zone dangereuse</h3>
        <p className="text-neutral-muted text-[13px] mb-4">
          La suppression de votre compte est irréversible et annulera tous vos abonnements.
        </p>
        <button className="px-5 py-2.5 border border-red-200 rounded-lg text-red-600 text-[13px] font-medium hover:bg-red-50 transition-colors">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}
