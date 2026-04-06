import { useState, useEffect } from "react";
import {
  Key,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { apiCall } from "../../lib/api";
import { SeatQuotaBar } from "../../components/licences/SeatQuotaBar";

/* ── design tokens ── */
const BG = "#FAFAF7";
const SURFACE = "#FFFFFF";
const ACCENT = "#EF9F27";
const TEXT = "#1A1A1A";
const MUTED = "#888";
const BORDER = "#E8E8E0";

type Step = 1 | 2 | 3;

interface LicencePreview {
  product_name: string;
  plan_name: string;
  max_seats: number;
  used_seats: number;
  expires_at: string | null;
  status: string;
}

export function ActivatePage({ userId }: { userId?: string }) {
  const [step, setStep] = useState<Step>(1);
  const [activationKey, setActivationKey] = useState("");
  const [preview, setPreview] = useState<LicencePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Pre-fill key from URL param ?key=xxx */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (key) setActivationKey(key);
  }, []);

  /* Step 1 -> Step 2: validate key */
  const handleValidateKey = async () => {
    if (!activationKey.trim()) {
      setError("Veuillez saisir une cle d'activation.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<{ valid: boolean; licence: LicencePreview }>(
        "validate-activation-key",
        { method: "POST", body: { activation_key: activationKey.trim() } }
      );
      if (!data.valid) {
        setError("Cle d'activation invalide ou deja utilisee.");
        return;
      }
      setPreview(data.licence);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Erreur de validation.");
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 -> Step 3: activate */
  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiCall("activate-licence", {
        method: "POST",
        body: { activation_key: activationKey.trim() },
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'activation.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Stepper dots ── */
  const Stepper = () => (
    <div className="flex items-center justify-center gap-3 mb-10">
      {([1, 2, 3] as Step[]).map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
            style={{
              background: step >= s ? ACCENT : BORDER,
              color: step >= s ? "#FFF" : MUTED,
            }}
          >
            {s}
          </div>
          {s < 3 && (
            <div
              className="w-10 h-0.5 rounded"
              style={{ background: step > s ? ACCENT : BORDER }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 15,
    outline: "none",
    width: "100%",
    fontFamily: "monospace",
    letterSpacing: 1,
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: TEXT }}>
        Activer une licence
      </h1>
      <p className="text-sm mb-8 text-center" style={{ color: MUTED }}>
        Activez votre cle pour debloquer l'acces a votre application
      </p>

      <Stepper />

      {/* ── Step 1: Enter key ── */}
      {step === 1 && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-3 mb-5">
            <Key size={22} style={{ color: ACCENT }} />
            <h2 className="text-base font-bold" style={{ color: TEXT }}>
              Cle d'activation
            </h2>
          </div>

          <input
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            style={inputStyle}
          />

          {error && (
            <p className="flex items-center gap-1.5 mt-3 text-sm" style={{ color: "#DC2626" }}>
              <AlertTriangle size={14} /> {error}
            </p>
          )}

          <button
            onClick={handleValidateKey}
            disabled={loading}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: ACCENT, color: "#FFF", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Verifier la cle
          </button>
        </div>
      )}

      {/* ── Step 2: Review + Activate ── */}
      {step === 2 && preview && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <h2 className="text-base font-bold mb-5" style={{ color: TEXT }}>
            Details de la licence
          </h2>

          <dl className="space-y-3 mb-5">
            {[
              ["Produit", preview.product_name],
              ["Plan", preview.plan_name],
              [
                "Expiration",
                preview.expires_at
                  ? new Date(preview.expires_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Illimitee",
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm" style={{ color: MUTED }}>{label}</dt>
                <dd className="text-sm font-medium" style={{ color: TEXT }}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mb-5">
            <p className="text-xs mb-1.5" style={{ color: MUTED }}>Sieges</p>
            <SeatQuotaBar used={preview.used_seats} max={preview.max_seats} />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 mb-3 text-sm" style={{ color: "#DC2626" }}>
              <AlertTriangle size={14} /> {error}
            </p>
          )}

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: ACCENT, color: "#FFF", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Activer
          </button>
        </div>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && (
        <div
          className="p-8 rounded-2xl text-center"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <CheckCircle size={48} style={{ color: "#22C55E" }} className="mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2" style={{ color: TEXT }}>
            Licence activee avec succes !
          </h2>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            Votre licence est maintenant active. Vous pouvez acceder a votre espace.
          </p>
          <button
            onClick={() => {
              window.location.href = "/portal";
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: ACCENT, color: "#FFF", border: "none", cursor: "pointer" }}
          >
            Acceder a mon espace <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
