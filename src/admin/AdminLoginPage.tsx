import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
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

  // Already logged in as admin — redirect
  if (user) {
    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
      if (data?.role === 'admin') navigate('/admin', { replace: true });
    });
  }

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    // Check if user is admin
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.session.user.id)
        .single();

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
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo size={36} color="text-neutral-light" />
          <div className="flex items-center justify-center gap-2 mt-3">
            <Shield size={14} className="text-gold" strokeWidth={1.5} />
            <span className="text-gold text-[11px] font-bold uppercase tracking-widest">Administration</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur">
          <h2 className="text-neutral-light text-lg font-bold mb-6 text-center">
            Connexion administrateur
          </h2>

          <div className="mb-4">
            <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@atlasstudio.com"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-sm outline-none transition-colors focus:border-gold placeholder:text-neutral-600"
            />
          </div>

          <div className="mb-4">
            <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-sm outline-none transition-colors focus:border-gold placeholder:text-neutral-600"
            />
          </div>

          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-gold w-full mt-5"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Vérification..." : "Se connecter"}
          </button>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-neutral-500 text-[13px] hover:text-gold transition-colors">
            &larr; Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
