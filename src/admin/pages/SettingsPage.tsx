import { useState, useEffect } from "react";
import { Save, Shield, Globe, Bell, Key, Loader2, CreditCard, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
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
  const [tab, setTab] = useState<"profile" | "security" | "notifications" | "payment">("profile");

  const [settings, setSettings] = useState<AdminSettings>({
    full_name: "", email: "", phone: "",
    totp_enabled: false, totp_secret: "",
    ip_whitelist: [],
    notification_email: true, notification_dashboard: true,
    session_duration_hours: 8,
  });
  const [recoveryEmail, setRecoveryEmail] = useState("");
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
      setRecoveryEmail((profile as any).recovery_email || "");
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

  const handleSaveRecoveryEmail = async () => {
    if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      showError("Adresse email invalide");
      return;
    }
    if (recoveryEmail && recoveryEmail.toLowerCase() === user?.email?.toLowerCase()) {
      showError("L'email de recuperation doit etre different de votre email principal");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      recovery_email: recoveryEmail || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user?.id);
    setSaving(false);
    if (error) showError(`Erreur: ${error.message}`);
    else success(recoveryEmail ? "Email de recuperation enregistre" : "Email de recuperation supprime");
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
    const { error } = await supabase.from("proph3t_preferences").upsert({
      preference_key: "notification_channels",
      preference_value: JSON.stringify(channels),
      updated_at: new Date().toISOString(),
    }, { onConflict: "preference_key" });
    setSaving(false);
    if (error) { console.error("Upsert error:", error); showError?.(`Erreur: ${error.message}`); }
    else { success("Notifications mises à jour"); }
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  // Payment config state
  const [paymentConfig, setPaymentConfig] = useState({
    stripe_secret_key: "", stripe_webhook_secret: "", stripe_publishable_key: "",
    cinetpay_api_key: "", cinetpay_site_id: "", cinetpay_secret_key: "",
    resend_api_key: "", from_email: "notifications@atlasstudio.org",
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("proph3t_preferences").select("*").eq("preference_key", "payment_config").single().then(({ data }) => {
      if (data?.preference_value) {
        try { setPaymentConfig(prev => ({ ...prev, ...JSON.parse(data.preference_value) })); } catch {}
      }
    });
  }, []);

  const handleSavePaymentConfig = async () => {
    setSaving(true);
    await supabase.from("proph3t_preferences").upsert({
      preference_key: "payment_config",
      preference_value: JSON.stringify(paymentConfig),
      description: "Configuration des moyens de paiement",
      updated_at: new Date().toISOString(),
    }, { onConflict: "preference_key" });
    setSaving(false);
    success("Configuration paiement sauvegardée");
  };

  const testProvider = async (provider: string) => {
    setTestingProvider(provider);
    // Simple connectivity test
    try {
      if (provider === "stripe" && paymentConfig.stripe_secret_key) {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${paymentConfig.stripe_secret_key}` },
        });
        if (res.ok) success("Stripe connecté !");
        else showError("Stripe: clé invalide ou erreur API");
      } else if (provider === "resend" && paymentConfig.resend_api_key) {
        const res = await fetch("https://api.resend.com/api-keys", {
          headers: { Authorization: `Bearer ${paymentConfig.resend_api_key}` },
        });
        if (res.ok) success("Resend connecté !");
        else showError("Resend: clé invalide");
      } else {
        showError("Clé API manquante");
      }
    } catch { showError("Erreur de connexion"); }
    setTestingProvider(null);
  };

  const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  const tabs = [
    { id: "profile" as const, label: "Profil", icon: Globe },
    { id: "security" as const, label: "Sécurité", icon: Shield },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "payment" as const, label: "Paiement", icon: CreditCard },
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
            {/* Recovery email */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield size={14} /> Email de recuperation
              </h3>
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg mb-3">
                <p className="text-amber-800 dark:text-amber-300 text-[12px] leading-relaxed">
                  En cas de perte d'acces a votre email principal, un lien de reinitialisation de mot de passe sera envoye a cette adresse de secours.
                  <strong className="block mt-1">Choisissez une adresse a laquelle vous avez toujours acces (email perso, professionnel alternatif).</strong>
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">
                    Email de recuperation
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="recovery@example.com"
                    className={ADMIN_INPUT_CLASS}
                  />
                  <p className="text-neutral-muted dark:text-admin-muted text-[11px] mt-1">
                    Doit etre different de votre email de connexion ({user?.email})
                  </p>
                </div>
                <button
                  onClick={handleSaveRecoveryEmail}
                  disabled={saving}
                  className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2"
                >
                  <Save size={14} /> {saving ? "..." : "Enregistrer l'email de recuperation"}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="border-t border-warm-border dark:border-admin-surface-alt pt-6">
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

        {/* Payment Configuration */}
        {tab === "payment" && (
          <div className="space-y-6">
            {/* Stripe */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Stripe (Cartes internationales)
              </h3>
              <div className="space-y-3">
                {([
                  { key: "stripe_secret_key", label: "Clé secrète (sk_...)", placeholder: "sk_live_..." },
                  { key: "stripe_publishable_key", label: "Clé publique (pk_...)", placeholder: "pk_live_..." },
                  { key: "stripe_webhook_secret", label: "Secret Webhook (whsec_...)", placeholder: "whsec_..." },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-neutral-body dark:text-admin-text/80 text-[12px] font-semibold mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type={showSecrets[key] ? "text" : "password"}
                        value={paymentConfig[key]}
                        onChange={e => setPaymentConfig(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className={`${inputClass} font-mono text-[12px] pr-10`}
                      />
                      <button onClick={() => toggleSecret(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                        {showSecrets[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <button onClick={() => testProvider("stripe")} disabled={testingProvider === "stripe"}
                    className="px-4 py-2 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
                    {testingProvider === "stripe" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Tester la connexion
                  </button>
                  <span className={`text-[11px] flex items-center gap-1 ${paymentConfig.stripe_secret_key ? "text-green-500" : "text-neutral-400"}`}>
                    {paymentConfig.stripe_secret_key ? <><CheckCircle size={11} /> Configuré</> : <><XCircle size={11} /> Non configuré</>}
                  </span>
                </div>
              </div>
            </div>

            {/* CinetPay */}
            <div className="border-t border-warm-border dark:border-admin-surface-alt pt-6">
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2">
                <CreditCard size={14} /> CinetPay (Mobile Money — Orange, MTN, Wave, Moov)
              </h3>
              <div className="space-y-3">
                {([
                  { key: "cinetpay_api_key", label: "Clé API", placeholder: "Votre clé API CinetPay" },
                  { key: "cinetpay_site_id", label: "Site ID", placeholder: "Votre Site ID CinetPay" },
                  { key: "cinetpay_secret_key", label: "Clé secrète", placeholder: "Clé pour vérification signature webhook" },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-neutral-body dark:text-admin-text/80 text-[12px] font-semibold mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type={showSecrets[key] ? "text" : "password"}
                        value={paymentConfig[key]}
                        onChange={e => setPaymentConfig(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className={`${inputClass} font-mono text-[12px] pr-10`}
                      />
                      <button onClick={() => toggleSecret(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                        {showSecrets[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <span className={`text-[11px] flex items-center gap-1 ${paymentConfig.cinetpay_api_key ? "text-green-500" : "text-neutral-400"}`}>
                  {paymentConfig.cinetpay_api_key ? <><CheckCircle size={11} /> Configuré</> : <><XCircle size={11} /> Non configuré</>}
                </span>
              </div>
            </div>

            {/* Resend (Email) */}
            <div className="border-t border-warm-border dark:border-admin-surface-alt pt-6">
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3 flex items-center gap-2">
                <Bell size={14} /> Resend (Emails transactionnels)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-neutral-body dark:text-admin-text/80 text-[12px] font-semibold mb-1">Clé API Resend</label>
                  <div className="relative">
                    <input
                      type={showSecrets["resend_api_key"] ? "text" : "password"}
                      value={paymentConfig.resend_api_key}
                      onChange={e => setPaymentConfig(p => ({ ...p, resend_api_key: e.target.value }))}
                      placeholder="re_..."
                      className={`${inputClass} font-mono text-[12px] pr-10`}
                    />
                    <button onClick={() => toggleSecret("resend_api_key")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                      {showSecrets["resend_api_key"] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-body dark:text-admin-text/80 text-[12px] font-semibold mb-1">Email expéditeur</label>
                  <input value={paymentConfig.from_email} onChange={e => setPaymentConfig(p => ({ ...p, from_email: e.target.value }))}
                    placeholder="notifications@atlasstudio.org" className={`${inputClass} text-[12px]`} />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => testProvider("resend")} disabled={testingProvider === "resend"}
                    className="px-4 py-2 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
                    {testingProvider === "resend" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Tester la connexion
                  </button>
                  <span className={`text-[11px] flex items-center gap-1 ${paymentConfig.resend_api_key ? "text-green-500" : "text-neutral-400"}`}>
                    {paymentConfig.resend_api_key ? <><CheckCircle size={11} /> Configuré</> : <><XCircle size={11} /> Non configuré</>}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={handleSavePaymentConfig} disabled={saving}
              className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2 mt-4">
              <Save size={14} /> {saving ? "..." : "Sauvegarder la configuration"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
