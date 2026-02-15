import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { InputField } from "./components/InputField";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        if (!name) { setError("Veuillez entrer votre nom"); setLoading(false); return; }
        const { error: err } = await signUp(email, password, { full_name: name, company_name: company });
        if (err) { setError(err); setLoading(false); return; }
        setError("");
        navigate("/portal");
      } else {
        const { error: err } = await signIn(email, password);
        if (err) { setError(err); setLoading(false); return; }
        navigate("/portal");
      }
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo size={42} color="text-neutral-light" />
          <p className="text-neutral-500 text-sm mt-2">Espace Client</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur">
          <h2 className="text-neutral-light text-xl font-bold mb-6 text-center">
            {isRegister ? "Créer un compte" : "Se connecter"}
          </h2>

          {isRegister && (
            <>
              <InputField label="Nom complet" value={name} onChange={setName} placeholder="Votre nom" />
              <InputField label="Entreprise" value={company} onChange={setCompany} placeholder="Nom de votre entreprise" />
            </>
          )}
          <InputField label="Email" value={email} onChange={setEmail} placeholder="vous@entreprise.com" type="email" />
          <InputField label="Mot de passe" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-gold w-full mt-5"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Chargement..." : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>

          <p className="text-center text-neutral-400 text-[13px] mt-5">
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}
            <span
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-gold cursor-pointer ml-1.5 font-semibold hover:underline"
            >
              {isRegister ? "Se connecter" : "Créer un compte"}
            </span>
          </p>
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
