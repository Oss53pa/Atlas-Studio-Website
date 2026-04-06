import { useState, useEffect } from "react";
import { Save, Shield, Globe, Bell, Key, Loader2 } from "lucide-react";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../contexts/ToastContext";

interface AdminSettings {
  full_name: string;
  email: string;
  phone: string;
  totp_enabled: boolean;
  totp_secret: string;
  ip_whitelist: string[];
  notification_email: boolean;
  notification_dashboard: boolean;
  session_duration_hours: number;
}

export default function SettingsPage() {
  const { success, error: showError } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profile" | "security" | "notifications">("profile");

  const [settings, setSettings] = useState<AdminSettings>({
    full_name: "", email: "", phone: "",
    totp_enabled: false, totp_secret: "",
    ip_whitelist: [],
    notification_email: true, notification_dashboard: true,
    session_duration_hours: 8,
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ipInput, setIpInput] = useState("");

  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      }));
    }
    // Load proph3t preferences for notifications
    supabase.from("proph3t_preferences").select("*").then(({ data }) => {
      if (data) {
        const prefs: Record<string, any> = {};
        data.forEach((p: any) => { prefs[p.preference_key] = p.preference_value; });
        setSettings(prev => ({
          ...prev,
          notification_email: (prefs.notification_channels || []).includes("email"),
          notification_dashboard: (prefs.notification_channels || []).includes("dashboard"),
          session_duration_hours: prefs.session_duration_hours || 8,
        }));
      }
      setLoading(false);
    });
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: settings.full_name,
      phone: settings.phone,
      updated_at: new Date().toISOString(),
    }).eq("id", user?.id);
    setSaving(false);
    success("Profil mis à jour");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) { showError("Le mot de passe doit faire au moins 8 caractères"); return; }
    if (newPassword !== confirmPassword) { showError("Les mots de passe ne correspondent pas"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) showError(`Erreur: ${error.message}`);
    else { success("Mot de passe modifié"); setNewPassword(""); setConfirmPassword(""); }
  };

  const addIp = () => {
    if (!ipInput.trim()) return;
    setSettings(prev => ({ ...prev, ip_whitelist: [...prev.ip_whitelist, ipInput.trim()] }));
    setIpInput("");
  };

  const removeIp = (index: number) => {
    setSettings(prev => ({ ...prev, ip_whitelist: prev.ip_whitelist.filter((_, i) => i !== index) }));
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    const channels = [];
    if (settings.notification_email) channels.push("email");
    if (settings.notification_dashboard) channels.push("dashboard");
    await supabase.from("proph3t_preferences").upsert({
      preference_key: "notification_channels",
      preference_value: JSON.stringify(channels),
      updated_at: new Date().toISOString(),
    }).catch(() => {});
    setSaving(false);
    success("Notifications mises à jour");
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  const tabs = [
    { id: "profile" as const, label: "Profil", icon: Globe },
    { id: "security" as const, label: "Sécurité", icon: Shield },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" /></div>;
  }

  return (
    <div>
      <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Paramètres</h1>
      <p className="text-neutral-muted dark:text-admin-muted text-sm mb-7">Configuration de la console d'administration</p>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t.id ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 max-w-2xl">
        {/* Profile */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nom complet</label>
              <input value={settings.full_name} onChange={e => setSettings(p => ({ ...p, full_name: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Email</label>
              <input value={settings.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Téléphone</label>
              <input value={settings.phone} onChange={e => setSettings(p => ({ ...p, phone: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
            <button onClick={handleSaveProfile} disabled={saving}
              className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
              <Save size={14} /> {saving ? "..." : "Sauvegarder"}
            </button>
          </div>
        )}

        {/* Security */}
        {tab === "security" && (
          <div className="space-y-6">
            {/* Password */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2"><Key size={14} /> Changer le mot de passe</h3>
              <div className="space-y-3">
                <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nouveau mot de passe</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" className={ADMIN_INPUT_CLASS} /></div>
                <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Confirmer</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={ADMIN_INPUT_CLASS} /></div>
                <button onClick={handleChangePassword} disabled={saving || !newPassword}
                  className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${!newPassword ? "opacity-50" : ""}`}>
                  Modifier le mot de passe
                </button>
              </div>
            </div>

            {/* 2FA TOTP */}
            <div className="border-t border-warm-border dark:border-admin-surface-alt pt-6">
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2"><Shield size={14} /> Authentification à deux facteurs (2FA)</h3>
              <div className="p-4 bg-warm-bg dark:bg-admin-surface-alt rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-neutral-text dark:text-admin-text text-sm font-medium">TOTP Authenticator</div>
                    <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Google Authenticator, Authy, etc.</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${settings.totp_enabled ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-neutral-100 dark:bg-admin-surface text-neutral-500 dark:text-admin-muted"}`}>
                    {settings.totp_enabled ? "Activé" : "Désactivé"}
                  </span>
                </div>
                <p className="text-neutral-muted dark:text-admin-muted text-[12px] mt-2">
                  {settings.totp_enabled
                    ? "La 2FA est active. Vous devrez entrer un code TOTP à chaque connexion."
                    : "Activez la 2FA pour sécuriser votre compte. Nécessite une app d'authentification."}
                </p>
                <button className="mt-3 px-4 py-2 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">
                  {settings.totp_enabled ? "Désactiver la 2FA" : "Configurer la 2FA"}
                </button>
              </div>
            </div>

            {/* IP Whitelist */}
            <div className="border-t border-warm-border dark:border-admin-surface-alt pt-6">
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2"><Globe size={14} /> IP Whitelist (optionnel)</h3>
              <p className="text-neutral-muted dark:text-admin-muted text-[12px] mb-3">Restreindre l'accès admin à certaines adresses IP.</p>
              <div className="flex gap-2 mb-3">
                <input value={ipInput} onChange={e => setIpInput(e.target.value)} placeholder="192.168.1.1" onKeyDown={e => e.key === "Enter" && addIp()}
                  className={`flex-1 ${inputClass} font-mono`} />
                <button onClick={addIp} className="px-4 py-2.5 bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg text-[13px]">Ajouter</button>
              </div>
              {settings.ip_whitelist.length > 0 ? (
                <div className="space-y-1">
                  {settings.ip_whitelist.map((ip, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-warm-bg dark:bg-admin-surface-alt rounded-lg">
                      <span className="font-mono text-[13px] text-neutral-text dark:text-admin-text">{ip}</span>
                      <button onClick={() => removeIp(i)} className="text-red-400 hover:text-red-600 text-[11px] font-medium">Supprimer</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-muted dark:text-admin-muted text-[12px] italic">Aucune restriction IP — accès depuis partout</p>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {tab === "notifications" && (
          <div className="space-y-4">
            <p className="text-neutral-muted dark:text-admin-muted text-[13px] mb-4">Configurez comment vous recevez les alertes de <span className="font-logo text-gold dark:text-admin-accent">Proph3t</span>.</p>
            <label className="flex items-center gap-3 p-4 bg-warm-bg dark:bg-admin-surface-alt rounded-lg cursor-pointer">
              <input type="checkbox" checked={settings.notification_dashboard} onChange={e => setSettings(p => ({ ...p, notification_dashboard: e.target.checked }))}
                className="w-4 h-4 accent-gold dark:accent-admin-accent" />
              <div>
                <div className="text-neutral-text dark:text-admin-text text-sm font-medium">Notifications Dashboard</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Badges et toasts dans la console</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-warm-bg dark:bg-admin-surface-alt rounded-lg cursor-pointer">
              <input type="checkbox" checked={settings.notification_email} onChange={e => setSettings(p => ({ ...p, notification_email: e.target.checked }))}
                className="w-4 h-4 accent-gold dark:accent-admin-accent" />
              <div>
                <div className="text-neutral-text dark:text-admin-text text-sm font-medium">Notifications Email</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Recevoir les alertes critiques par email</div>
              </div>
            </label>
            <button onClick={handleSaveNotifications} disabled={saving}
              className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
              <Save size={14} /> {saving ? "..." : "Sauvegarder"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
