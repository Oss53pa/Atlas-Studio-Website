/**
 * Proph3tConfigPanel — UI réutilisable pour configurer le BYOK Proph3t.
 * Utilisé dans /portal/settings (clients) ET dans /admin/settings (admin).
 *
 * Lit/écrit la clé du user authentifié courant via la edge function `claude-proxy`.
 * Le backend stocke chaque clé chiffrée AES-256 dans `profiles.{anthropic|gemini}_api_key_encrypted`.
 * → Chaque user (client OU admin) gère SA propre clé.
 */
import { useEffect, useState } from "react";
import { apiCall } from "../../lib/api";

type AnthropicModel = "claude-haiku-4-5-20251001" | "claude-sonnet-4-6";
type GeminiModel = "gemini-2.0-flash" | "gemini-2.5-flash" | "gemini-2.5-pro";

type Proph3tStatus = {
  provider: "ollama" | "anthropic" | "gemini";
  anthropic: {
    model: AnthropicModel;
    has_key: boolean;
    key_set_at: string | null;
    key_last_used_at: string | null;
  };
  gemini: {
    model: GeminiModel;
    has_key: boolean;
    key_set_at: string | null;
    key_last_used_at: string | null;
  };
};

const ANTHROPIC_MODELS: { value: AnthropicModel; label: string; desc: string }[] = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", desc: "Rapide et économique (~$1 / $5 par M tokens)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Qualité supérieure (~$3 / $15 par M tokens)" },
];

const GEMINI_MODELS: { value: GeminiModel; label: string; desc: string }[] = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Le moins cher, qualité correcte (~$0.10 / $0.40 par M tokens)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Très bon rapport qualité/prix" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Qualité maximale Google (plus cher)" },
];

export interface Proph3tConfigPanelProps {
  /** Variant visuel : 'portal' (style clair clients) ou 'admin' (style console admin avec dark mode) */
  variant?: "portal" | "admin";
  /** Sous-titre affiché sous le panneau (par défaut adapté au variant) */
  subtitle?: string;
}

export function Proph3tConfigPanel({ variant = "portal", subtitle }: Proph3tConfigPanelProps) {
  const isAdmin = variant === "admin";

  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<Proph3tStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState<"anthropic" | "gemini">("anthropic");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedAnthropicModel, setSelectedAnthropicModel] = useState<AnthropicModel>("claude-haiku-4-5-20251001");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<GeminiModel>("gemini-2.0-flash");
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [clearingKey, setClearingKey] = useState(false);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const refreshStatus = async () => {
    const s = await apiCall<Proph3tStatus>("claude-proxy", { method: "POST", body: { action: "get_status" } });
    setStatus(s);
    if (s.anthropic?.model) setSelectedAnthropicModel(s.anthropic.model);
    if (s.gemini?.model) setSelectedGeminiModel(s.gemini.model);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try { if (!cancelled) await refreshStatus(); }
      catch (err: any) { if (!cancelled) flashToast(`Erreur : ${err.message}`); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 20) {
      flashToast("Clé invalide (trop courte)");
      return;
    }
    setSavingKey(true);
    const t0 = Date.now();
    console.log("[proph3t] save_key start", { provider: activeProvider, keyLen: apiKeyInput.trim().length });
    try {
      const model = activeProvider === "anthropic" ? selectedAnthropicModel : selectedGeminiModel;
      console.log("[proph3t] calling claude-proxy with model", model);
      const res = await apiCall<{ ok: boolean; error?: string }>("claude-proxy", {
        method: "POST",
        body: { action: "save_key", provider: activeProvider, api_key: apiKeyInput.trim(), model },
      });
      console.log("[proph3t] save_key response in", Date.now() - t0, "ms", res);
      if (res.ok) {
        flashToast("Clé enregistrée et testée avec succès");
        setApiKeyInput("");
        await refreshStatus();
      } else {
        flashToast(`Erreur : ${res.error || "reponse inattendue"}`);
      }
    } catch (err: any) {
      console.error("[proph3t] save_key FAILED in", Date.now() - t0, "ms", err);
      flashToast(`Erreur : ${err.message}`);
    }
    finally { setSavingKey(false); }
  };

  const handleTestKey = async (provider: "anthropic" | "gemini") => {
    setTestingKey(true);
    try {
      const res = await apiCall<{ ok: boolean; error?: string; model?: string }>("claude-proxy", {
        method: "POST", body: { action: "test_key", provider },
      });
      flashToast(res.ok ? `Clé ${provider} OK — modèle ${res.model}` : `Test échoué : ${res.error}`);
    } catch (err: any) { flashToast(`Erreur : ${err.message}`); }
    finally { setTestingKey(false); }
  };

  const handleClearKey = async (provider: "anthropic" | "gemini") => {
    if (!confirm(`Supprimer votre clé ${provider} ?`)) return;
    setClearingKey(true);
    try {
      await apiCall("claude-proxy", { method: "POST", body: { action: "clear_key", provider } });
      await refreshStatus();
      flashToast(`Clé ${provider} supprimée.`);
    } catch (err: any) { flashToast(`Erreur : ${err.message}`); }
    finally { setClearingKey(false); }
  };

  const handleProviderChange = async (provider: "ollama" | "anthropic" | "gemini") => {
    if (provider === "anthropic" && !status?.anthropic?.has_key) {
      flashToast("Saisissez d'abord une clé Anthropic.");
      return;
    }
    if (provider === "gemini" && !status?.gemini?.has_key) {
      flashToast("Saisissez d'abord une clé Gemini.");
      return;
    }
    try {
      await apiCall("claude-proxy", { method: "POST", body: { action: "set_settings", provider } });
      await refreshStatus();
      flashToast(`Provider actif : ${provider}.`);
    } catch (err: any) { flashToast(`Erreur : ${err.message}`); }
  };

  const handleModelChange = async (model: AnthropicModel | GeminiModel) => {
    if ((ANTHROPIC_MODELS as ReadonlyArray<{ value: string }>).some(m => m.value === model)) {
      setSelectedAnthropicModel(model as AnthropicModel);
    } else {
      setSelectedGeminiModel(model as GeminiModel);
    }
    try {
      await apiCall("claude-proxy", { method: "POST", body: { action: "set_settings", model } });
      await refreshStatus();
      flashToast(`Modèle : ${model}`);
    } catch (err: any) { flashToast(`Erreur : ${err.message}`); }
  };

  // ── Styles : portal (clair) vs admin (avec dark mode) ──
  const containerCls = isAdmin
    ? "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6"
    : "bg-white border border-warm-border rounded-2xl p-7";
  const titleCls = isAdmin
    ? "text-neutral-text dark:text-admin-text text-base font-bold mb-2"
    : "text-neutral-text text-base font-bold mb-2";
  const subtitleCls = isAdmin
    ? "text-neutral-muted dark:text-admin-muted text-[13px] mb-5"
    : "text-neutral-muted text-[13px] mb-5";
  const inputCls = isAdmin
    ? "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors"
    : "w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors";
  const labelCls = isAdmin
    ? "block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-2"
    : "block text-neutral-body text-[13px] font-semibold mb-2";
  const cardSelected = isAdmin
    ? "border-gold dark:border-admin-accent bg-gold/5 dark:bg-admin-accent/10"
    : "border-gold bg-gold/5";
  const cardUnselected = isAdmin
    ? "border-warm-border dark:border-admin-surface-alt hover:border-neutral-muted dark:hover:border-admin-text/40"
    : "border-warm-border hover:border-neutral-muted";

  return (
    <div className={containerCls}>
      <h3 className={titleCls}>Configuration IA Proph3t</h3>
      <p className={subtitleCls}>
        {subtitle ?? (isAdmin
          ? "Configurez votre propre clé Anthropic ou Gemini pour Proph3t. Cette clé est dédiée à votre usage administrateur — vos clients ont leur propre configuration via leur portail."
          : "Choisissez le moteur d'IA utilisé par Proph3t. Ollama (gratuit) hébergé par Atlas Studio, Anthropic Claude (qualité premium), ou Google Gemini (le moins cher).")}
      </p>

      {toast && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-gold/10 dark:bg-admin-accent/10 border border-gold/20 dark:border-admin-accent/30 text-gold dark:text-admin-accent text-sm font-medium">
          {toast}
        </div>
      )}

      {loading && !status && <div className="text-neutral-muted text-sm">Chargement…</div>}

      {status && (
        <>
          {/* Provider selector — 3 cards */}
          <div className="mb-6">
            <label className={labelCls}>Moteur IA actif</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => handleProviderChange("ollama")}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  status.provider === "ollama" ? cardSelected : cardUnselected
                }`}>
                <div className="font-semibold text-neutral-text dark:text-admin-text text-[13px]">Ollama</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-1">Gratuit, hébergé. Llama 3.1 8B. Qualité basique.</div>
              </button>
              <button onClick={() => handleProviderChange("anthropic")} disabled={!status.anthropic?.has_key}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  status.provider === "anthropic" ? cardSelected : cardUnselected
                } ${!status.anthropic?.has_key ? "opacity-50 cursor-not-allowed" : ""}`}>
                <div className="font-semibold text-neutral-text dark:text-admin-text text-[13px]">Claude API (BYOK)</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-1">Anthropic Haiku/Sonnet 4.x. Qualité premium.</div>
              </button>
              <button onClick={() => handleProviderChange("gemini")} disabled={!status.gemini?.has_key}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  status.provider === "gemini" ? cardSelected : cardUnselected
                } ${!status.gemini?.has_key ? "opacity-50 cursor-not-allowed" : ""}`}>
                <div className="font-semibold text-neutral-text dark:text-admin-text text-[13px]">Gemini API (BYOK)</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-1">Google Gemini 2.x Flash/Pro. Le moins cher.</div>
              </button>
            </div>
          </div>

          {/* Sub-tabs Anthropic / Gemini */}
          <div className="border-t border-warm-border dark:border-admin-surface-alt pt-5">
            <div className="flex gap-1 border-b border-warm-border dark:border-admin-surface-alt mb-5">
              <button onClick={() => setActiveProvider("anthropic")}
                className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                  activeProvider === "anthropic"
                    ? "border-gold dark:border-admin-accent text-gold dark:text-admin-accent"
                    : "border-transparent text-neutral-muted dark:text-admin-muted hover:text-neutral-body dark:hover:text-admin-text"
                }`}>Anthropic Claude</button>
              <button onClick={() => setActiveProvider("gemini")}
                className={`px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                  activeProvider === "gemini"
                    ? "border-gold dark:border-admin-accent text-gold dark:text-admin-accent"
                    : "border-transparent text-neutral-muted dark:text-admin-muted hover:text-neutral-body dark:hover:text-admin-text"
                }`}>Google Gemini</button>
            </div>

            {activeProvider === "anthropic" && (
              <>
                <label className={labelCls}>Modèle Claude</label>
                <div className="space-y-2 mb-4">
                  {ANTHROPIC_MODELS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAnthropicModel === opt.value ? cardSelected : cardUnselected
                      }`}>
                      <input type="radio" name="anthropic_model"
                        checked={selectedAnthropicModel === opt.value}
                        onChange={() => handleModelChange(opt.value)} className="mt-1" />
                      <div>
                        <div className="font-semibold text-neutral-text dark:text-admin-text text-[13px]">{opt.label}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[12px] mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <KeyManagementBlock
                  provider="anthropic"
                  hasKey={!!status.anthropic?.has_key}
                  keySetAt={status.anthropic?.key_set_at}
                  keyLastUsedAt={status.anthropic?.key_last_used_at}
                  apiKeyInput={apiKeyInput}
                  setApiKeyInput={setApiKeyInput}
                  placeholder="sk-ant-api03-..."
                  consoleUrl="https://console.anthropic.com/settings/keys"
                  consoleLabel="console.anthropic.com"
                  savingKey={savingKey}
                  testingKey={testingKey}
                  clearingKey={clearingKey}
                  onSave={handleSaveKey}
                  onTest={() => handleTestKey("anthropic")}
                  onClear={() => handleClearKey("anthropic")}
                  inputClass={inputCls}
                  isAdmin={isAdmin}
                />
              </>
            )}

            {activeProvider === "gemini" && (
              <>
                <label className={labelCls}>Modèle Gemini</label>
                <div className="space-y-2 mb-4">
                  {GEMINI_MODELS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedGeminiModel === opt.value ? cardSelected : cardUnselected
                      }`}>
                      <input type="radio" name="gemini_model"
                        checked={selectedGeminiModel === opt.value}
                        onChange={() => handleModelChange(opt.value)} className="mt-1" />
                      <div>
                        <div className="font-semibold text-neutral-text dark:text-admin-text text-[13px]">{opt.label}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[12px] mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <KeyManagementBlock
                  provider="gemini"
                  hasKey={!!status.gemini?.has_key}
                  keySetAt={status.gemini?.key_set_at}
                  keyLastUsedAt={status.gemini?.key_last_used_at}
                  apiKeyInput={apiKeyInput}
                  setApiKeyInput={setApiKeyInput}
                  placeholder="AIza..."
                  consoleUrl="https://aistudio.google.com/apikey"
                  consoleLabel="aistudio.google.com"
                  savingKey={savingKey}
                  testingKey={testingKey}
                  clearingKey={clearingKey}
                  onSave={handleSaveKey}
                  onTest={() => handleTestKey("gemini")}
                  onClear={() => handleClearKey("gemini")}
                  inputClass={inputCls}
                  isAdmin={isAdmin}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KeyManagementBlock(props: {
  provider: "anthropic" | "gemini";
  hasKey: boolean;
  keySetAt: string | null | undefined;
  keyLastUsedAt: string | null | undefined;
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  placeholder: string;
  consoleUrl: string;
  consoleLabel: string;
  savingKey: boolean;
  testingKey: boolean;
  clearingKey: boolean;
  onSave: () => void;
  onTest: () => void;
  onClear: () => void;
  inputClass: string;
  isAdmin: boolean;
}) {
  const providerLabel = props.provider === "anthropic" ? "Anthropic" : "Google Gemini";
  const labelCls = props.isAdmin
    ? "block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-2"
    : "block text-neutral-body text-[13px] font-semibold mb-2";
  const buttonCls = props.isAdmin
    ? "bg-gold dark:bg-admin-accent text-onyx font-semibold rounded-lg px-5 py-2.5 hover:opacity-90 transition-colors text-[13px] mt-4"
    : "btn-gold mt-4 !py-2.5 !text-[13px]";

  return (
    <div>
      <label className={labelCls}>Clé API {providerLabel}</label>

      {props.hasKey && (
        <div className="bg-warm-bg dark:bg-admin-surface-alt rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium">✓ Clé configurée</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[12px] mt-1">
                {props.keySetAt ? `Enregistrée le ${new Date(props.keySetAt).toLocaleDateString("fr-FR")}` : ""}
                {props.keyLastUsedAt ? ` · dernier usage ${new Date(props.keyLastUsedAt).toLocaleDateString("fr-FR")}` : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={props.onTest} disabled={props.testingKey}
                className="px-3 py-1.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-body dark:text-admin-text text-[12px] hover:bg-white dark:hover:bg-admin-surface transition-colors">
                {props.testingKey ? "Test…" : "Tester"}
              </button>
              <button onClick={props.onClear} disabled={props.clearingKey}
                className="px-3 py-1.5 border border-red-200 dark:border-red-900/40 rounded-lg text-red-600 dark:text-red-400 text-[12px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                {props.clearingKey ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <input type="password" value={props.apiKeyInput}
          onChange={e => props.setApiKeyInput(e.target.value)}
          placeholder={props.hasKey ? "Coller une nouvelle clé pour la remplacer" : props.placeholder}
          className={props.inputClass} autoComplete="off" />
        <p className="text-neutral-muted dark:text-admin-muted text-[11px]">
          Récupérez votre clé sur{" "}
          <a href={props.consoleUrl} target="_blank" rel="noopener noreferrer" className="text-gold dark:text-admin-accent hover:underline">
            {props.consoleLabel}
          </a>. Elle est chiffrée AES-256 côté serveur et n'est jamais renvoyée au navigateur.
        </p>
      </div>

      <button onClick={props.onSave} disabled={props.savingKey || !props.apiKeyInput.trim()}
        className={`${buttonCls} ${!props.apiKeyInput.trim() ? "opacity-50" : ""}`}>
        {props.savingKey ? "Test et enregistrement…" : "Enregistrer la clé"}
      </button>
    </div>
  );
}
