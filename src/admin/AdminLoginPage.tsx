import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Zap, Loader2 } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export default function AdminLoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role === 'admin') navigate('/admin', { replace: true });
      });
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Veuillez remplir tous les champs"); return; }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); return; }

    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.session.user.id).single();
      if (profile?.role !== 'admin') {
        setError("Accès refusé. Ce compte n'a pas les droits administrateur.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center px-5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-admin-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10">
          <Logo size={36} color="text-admin-text" />
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield size={14} className="text-admin-accent" strokeWidth={1.5} />
            <span className="text-admin-accent text-[11px] font-bold uppercase tracking-widest">Administration</span>
          </div>
        </div>

        <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap size={18} className="text-admin-accent" />
            <h2 className="text-admin-text text-lg font-bold">Connexion</h2>
          </div>

          <div className="mb-4">
            <label className="block text-admin-muted text-[13px] font-semibold mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@atlasstudio.com"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none transition-colors focus:border-admin-accent placeholder:text-admin-muted/40"
            />
          </div>

          <div className="mb-4">
            <label className="block text-admin-muted text-[13px] font-semibold mb-1.5">Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none transition-colors focus:border-admin-accent placeholder:text-admin-muted/40"
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors flex items-center justify-center gap-2"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : "Se connecter"}
          </button>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-admin-muted text-[13px] hover:text-admin-accent transition-colors">
            &larr; Retour au site
          </Link>
        </p>

        <p className="text-center mt-4 text-admin-muted/40 text-[11px]">
          Console Atlas Studio v2.0 — <span className="font-logo text-admin-accent/60">Proph3t</span> Intelligence
        </p>
      </div>
    </div>
  );
}
