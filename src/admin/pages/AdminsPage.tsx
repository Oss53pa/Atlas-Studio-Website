import { useState, useEffect } from "react";
import {
  ShieldCheck, ShieldOff, Plus, Loader2, Crown, Trash2, X,
  Mail, User, Eye, EyeOff, AlertTriangle, Check,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { apiCall } from "../../lib/api";
import { formatSupabaseError } from "../../lib/errorMessages";

interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  role: "admin" | "super_admin";
  is_active: boolean;
  last_sign_in_at?: string | null;
  created_at: string;
}

export default function AdminsPage() {
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, company_name, role, is_active, created_at")
      .in("role", ["admin", "super_admin"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch admins error:", error);
      showError(formatSupabaseError(error));
    } else {
      setAdmins((data as AdminProfile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 14; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm(f => ({ ...f, password: pwd }));
    setShowPassword(true);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) {
      showError("Email, nom et mot de passe sont requis");
      return;
    }
    if (form.password.length < 8) {
      showError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setActionLoading("create");
    try {
      // Step 1: create user via admin-clients edge function (creates auth user + profile with role=client)
      const result = await apiCall<{ success: boolean; userId: string; error?: string }>("admin-clients", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          send_welcome: true,
        },
      });

      // Step 2: promote the new user to 'admin' role
      const { error: promoteError } = await supabase
        .from("profiles")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", result.userId);

      if (promoteError) {
        showError(`Compte créé mais promotion échouée: ${formatSupabaseError(promoteError)}`);
      } else {
        success(`Admin "${form.full_name}" créé et notifié par email`);
      }

      setForm({ email: "", password: "", full_name: "", phone: "" });
      setShowCreate(false);
      fetchAdmins();
    } catch (err: unknown) {
      showError(formatSupabaseError(err, "Création impossible"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (admin: AdminProfile) => {
    if (admin.id === currentUser?.id) {
      showError("Vous ne pouvez pas vous révoquer vous-même");
      return;
    }
    if (admin.role === "super_admin") {
      showError("Impossible de révoquer un super_admin");
      return;
    }
    setActionLoading(admin.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "client", is_active: false, updated_at: new Date().toISOString() })
      .eq("id", admin.id);
    if (error) {
      showError(formatSupabaseError(error));
    } else {
      success(`Accès admin révoqué pour ${admin.full_name || admin.email}`);
      fetchAdmins();
    }
    setActionLoading(null);
    setConfirmDelete(null);
  };

  const handlePromoteSuperAdmin = async (admin: AdminProfile) => {
    if (admin.role === "super_admin") return;
    if (!confirm(`⚠️ ATTENTION : Promouvoir ${admin.full_name || admin.email} en SUPER ADMIN lui donnera les memes pouvoirs que vous (gerer les autres admins, etc.). Cette action est sensible. Confirmer ?`)) {
      return;
    }
    setActionLoading(admin.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "super_admin", is_active: true, updated_at: new Date().toISOString() })
      .eq("id", admin.id);
    if (error) {
      showError(formatSupabaseError(error));
    } else {
      success(`${admin.full_name || admin.email} promu Super Admin`);
      fetchAdmins();
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (admin: AdminProfile) => {
    if (admin.id === currentUser?.id) {
      showError("Vous ne pouvez pas vous désactiver vous-même");
      return;
    }
    if (admin.role === "super_admin") {
      showError("Impossible de désactiver un super_admin");
      return;
    }
    setActionLoading(admin.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !admin.is_active, updated_at: new Date().toISOString() })
      .eq("id", admin.id);
    if (error) {
      showError(formatSupabaseError(error));
    } else {
      success(admin.is_active ? "Admin désactivé" : "Admin réactivé");
      fetchAdmins();
    }
    setActionLoading(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1 flex items-center gap-2">
            <Crown size={22} className="text-[#EF9F27]" />
            Gestion des Admins
          </h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">
            Section réservée — créez, désactivez et révoquez les administrateurs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#EF9F27] text-[#0A0A0B] rounded-lg text-sm font-semibold hover:bg-[#D4B872] transition-colors"
        >
          <Plus size={15} />
          Nouvel admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total admins" value={admins.length} icon={ShieldCheck} color="#EF9F27" />
        <StatCard label="Actifs" value={admins.filter(a => a.is_active).length} icon={Check} color="#22C55E" />
        <StatCard label="Super Admin" value={admins.filter(a => a.role === "super_admin").length} icon={Crown} color="#A855F7" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-20 text-neutral-muted dark:text-admin-muted">
          Aucun admin trouvé
        </div>
      ) : (
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-warm-bg dark:bg-admin-surface-alt border-b border-warm-border dark:border-admin-surface-alt">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Admin</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Rôle</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Statut</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Créé le</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => {
                const isSelf = admin.id === currentUser?.id;
                const isSuperAdmin = admin.role === "super_admin";
                const isLoading = actionLoading === admin.id;
                return (
                  <tr key={admin.id} className="border-b border-warm-border dark:border-admin-surface-alt last:border-0 hover:bg-warm-bg/50 dark:hover:bg-admin-surface-alt/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${isSuperAdmin ? "bg-purple-500/15 text-purple-400" : "bg-[#EF9F27]/15 text-[#EF9F27]"}`}>
                          {(admin.full_name || admin.email).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-neutral-text dark:text-admin-text text-sm font-medium flex items-center gap-2">
                            {admin.full_name || "Sans nom"}
                            {isSelf && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">VOUS</span>}
                          </div>
                          <div className="text-neutral-muted dark:text-admin-muted text-[12px]">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 text-[11px] font-semibold">
                          <Crown size={11} />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EF9F27]/15 text-[#EF9F27] text-[11px] font-semibold">
                          <ShieldCheck size={11} />
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${admin.is_active ? "bg-green-500/15 text-green-500" : "bg-neutral-500/15 text-neutral-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? "bg-green-500" : "bg-neutral-500"}`} />
                        {admin.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-muted dark:text-admin-muted text-[12px]">
                      {new Date(admin.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperAdmin || isSelf ? (
                          <span className="text-[11px] text-neutral-muted dark:text-admin-muted italic">Protégé</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePromoteSuperAdmin(admin)}
                              disabled={isLoading}
                              title="Promouvoir Super Admin"
                              className="p-1.5 rounded hover:bg-purple-500/10 text-neutral-muted dark:text-admin-muted hover:text-purple-400 transition-colors"
                            >
                              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                            </button>
                            <button
                              onClick={() => handleToggleActive(admin)}
                              disabled={isLoading}
                              title={admin.is_active ? "Désactiver" : "Réactiver"}
                              className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-[#EF9F27] transition-colors"
                            >
                              {admin.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(admin)}
                              disabled={isLoading}
                              title="Révoquer"
                              className="p-1.5 rounded hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border dark:border-admin-surface-alt">
              <h3 className="text-neutral-text dark:text-admin-text font-bold text-lg">Créer un nouvel admin</h3>
              <button onClick={() => setShowCreate(false)} className="text-neutral-muted dark:text-admin-muted hover:text-[#EF9F27]">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Nom complet" icon={User}>
                <input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-[#EF9F27]"
                />
              </Field>
              <Field label="Email professionnel" icon={Mail}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@atlasstudio.org"
                  className="w-full px-3 py-2 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-[#EF9F27]"
                />
              </Field>
              <Field label="Téléphone (optionnel)">
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full px-3 py-2 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-[#EF9F27]"
                />
              </Field>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-neutral-muted dark:text-admin-muted uppercase tracking-wider">Mot de passe initial</label>
                  <button onClick={generatePassword} className="text-[10px] text-[#EF9F27] hover:underline">Générer</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 caractères"
                    className="w-full px-3 py-2 pr-10 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm font-mono text-neutral-text dark:text-admin-text outline-none focus:border-[#EF9F27]"
                  />
                  <button
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted hover:text-[#EF9F27]"
                    type="button"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-neutral-muted dark:text-admin-muted bg-warm-bg dark:bg-admin-surface-alt px-3 py-2 rounded-lg border border-warm-border dark:border-admin-surface-alt">
                ℹ️ Le nouvel admin recevra ses identifiants par email à l'adresse fournie.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-warm-border dark:border-admin-surface-alt flex items-center justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-neutral-muted dark:text-admin-muted hover:text-neutral-text dark:hover:text-admin-text">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading === "create"}
                className="px-4 py-2 bg-[#EF9F27] text-[#0A0A0B] rounded-lg text-sm font-semibold hover:bg-[#D4B872] disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === "create" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Créer l'admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-admin-surface border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-neutral-text dark:text-admin-text font-bold">Révoquer l'accès admin ?</h3>
                <p className="text-neutral-muted dark:text-admin-muted text-[12px]">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-neutral-body dark:text-admin-text/80 text-sm mb-2">
              <strong>{confirmDelete.full_name || confirmDelete.email}</strong> perdra immédiatement tous ses accès à la console d'administration.
            </p>
            <p className="text-neutral-muted dark:text-admin-muted text-[12px] mb-5">
              Le compte sera converti en compte client (rôle: client, désactivé).
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-neutral-muted dark:text-admin-muted hover:text-neutral-text dark:hover:text-admin-text">
                Annuler
              </button>
              <button
                onClick={() => handleRevoke(confirmDelete)}
                disabled={actionLoading === confirmDelete.id}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === confirmDelete.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Révoquer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-neutral-muted dark:text-admin-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {Icon && <Icon size={11} />}
        {label}
      </label>
      {children}
    </div>
  );
}
