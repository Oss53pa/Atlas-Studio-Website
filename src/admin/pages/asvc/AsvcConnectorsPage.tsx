import { useState } from 'react';
import { Mail, Github, Plug, CheckCircle2, AlertCircle, Loader2, X, Key } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useOAuthTokens, timeAgoFr } from './hooks';
import type { OAuthToken } from './types';

type ConnectorAuthKind = 'oauth' | 'pat';

interface ConnectorMeta {
  provider: string;
  label: string;
  description: string;
  Icon: typeof Mail;
  scopes: string;
  setupNote: string;
  auth_kind: ConnectorAuthKind;
}

const CONNECTORS: ConnectorMeta[] = [
  {
    provider: 'gmail',
    label: 'Gmail',
    description: 'Envoi des emails approuvés (réponses tickets, SDR outreach, relances factures, propositions commerciales).',
    Icon: Mail,
    scopes: 'gmail.send + openid email',
    setupNote: 'Requiert GOOGLE_OAUTH_CLIENT_ID / SECRET configurés côté Supabase Edge Functions.',
    auth_kind: 'oauth',
  },
  {
    provider: 'github',
    label: 'GitHub',
    description: 'Création des Pull Requests par Dev Agent + Issues par Bug Triage. Crée branche, pousse fichier de plan, ouvre PR draft.',
    Icon: Github,
    scopes: 'contents:write, pull_requests:write, issues:write',
    setupNote: 'Génère un fine-grained PAT sur github.com/settings/personal-access-tokens (durée illimitée recommandée), restreint aux repos atlas-studio/* avec scopes Contents (Read+Write), Pull requests (Read+Write), Issues (Read+Write).',
    auth_kind: 'pat',
  },
];

export default function AsvcConnectorsPage() {
  const { tokens, loading, startGmailOAuth, setPat, revoke, revoking } = useOAuthTokens();
  const [patModalOpen, setPatModalOpen] = useState<null | 'github'>(null);

  const tokenFor = (provider: string) =>
    tokens.filter((t) => t.provider === provider && t.status === 'active');

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Connecteurs"
        subtitle="Connexions OAuth aux services externes — refresh tokens / PATs chiffrés AES-256, jamais exposés"
      />

      <div className="mb-5 rounded-lg border border-white/5 bg-onyx-light/20 p-3 text-[12px] text-neutral-400">
        <Plug size={13} className="inline mr-1.5" />
        Les actions approuvées par la CEO restent en base tant qu'aucun connecteur n'est configuré.
        L'orchestrateur d'exécution route automatiquement vers le bon connecteur selon l'<code>action_type</code>.
      </div>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      <div className="space-y-4">
        {CONNECTORS.map((meta) => {
          const active = tokenFor(meta.provider);
          const handleConnect = () => {
            if (meta.auth_kind === 'oauth' && meta.provider === 'gmail') {
              startGmailOAuth();
            } else if (meta.auth_kind === 'pat' && meta.provider === 'github') {
              setPatModalOpen('github');
            }
          };
          return (
            <ConnectorCard
              key={meta.provider}
              meta={meta}
              tokens={active}
              revoking={revoking}
              onConnect={handleConnect}
              onRevoke={(email) => revoke(meta.provider, email)}
            />
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-white/10 bg-onyx-light/20 p-5">
        <h2 className="text-neutral-light text-[13px] font-semibold mb-2">
          Connecteurs à venir
        </h2>
        <ul className="text-neutral-400 text-[12px] space-y-1.5 list-disc list-inside marker:text-admin-accent">
          <li><strong>Vercel</strong> — déploiements production réels (préparés par DevOps Agent)</li>
          <li><strong>LinkedIn / X / Meta</strong> — publication des posts Content Agent</li>
          <li><strong>CinetPay / Stripe</strong> — paiements et webhooks pour Facturation Agent</li>
          <li><strong>WhatsApp Business</strong> — réponses Support N1 et SDR sur ce canal</li>
        </ul>
      </section>

      {patModalOpen === 'github' && (
        <PatModal
          provider="github"
          title="Connecter GitHub"
          subtitle="Colle un Personal Access Token (fine-grained recommandé)"
          helpUrl="https://github.com/settings/personal-access-tokens/new"
          helpText="Génère le PAT sur GitHub (scopes : Contents Read+Write, Pull requests Read+Write, Issues Read+Write, restreint aux repos atlas-studio/*)"
          onClose={() => setPatModalOpen(null)}
          onSubmit={async (token) => {
            const r = await setPat('github', token);
            if (r.ok) {
              setPatModalOpen(null);
              return { ok: true };
            }
            return { ok: false, error: r.error };
          }}
        />
      )}
    </div>
  );
}

function ConnectorCard({
  meta,
  tokens,
  revoking,
  onConnect,
  onRevoke,
}: {
  meta: ConnectorMeta;
  tokens: OAuthToken[];
  revoking: boolean;
  onConnect: () => void;
  onRevoke: (email: string) => void;
}) {
  const connected = tokens.length > 0;
  const BtnIcon = meta.auth_kind === 'pat' ? Key : Plug;

  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-admin-accent/15 text-admin-accent flex items-center justify-center flex-shrink-0">
          <meta.Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-neutral-light text-[14px] font-semibold">{meta.label}</h3>
            {connected ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                <CheckCircle2 size={10} />
                {tokens.length} compte{tokens.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                Non connecté
              </span>
            )}
            {meta.auth_kind === 'pat' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded">
                <Key size={9} />
                PAT
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-[12px] leading-relaxed mb-1">{meta.description}</p>
          <p className="text-neutral-600 text-[10.5px]">
            Scopes : <code className="text-admin-accent/80">{meta.scopes}</code>
          </p>
        </div>

        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition flex-shrink-0"
        >
          <BtnIcon size={12} />
          {connected ? 'Ajouter un compte' : 'Connecter'}
        </button>
      </div>

      <p className="text-neutral-600 text-[10.5px] italic mb-3 flex items-start gap-1.5">
        <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
        {meta.setupNote}
      </p>

      {connected && (
        <div className="space-y-1.5 pt-3 border-t border-white/5">
          {tokens.map((t) => (
            <div
              key={t.account_email}
              className="flex items-center justify-between gap-2 bg-onyx-light/50 px-2.5 py-1.5 rounded-md"
            >
              <div className="min-w-0">
                <div className="text-neutral-light text-[12px] font-mono truncate">
                  {t.account_email}
                  {t.account_label && t.account_label !== t.account_email && (
                    <span className="text-neutral-500 ml-2">({t.account_label})</span>
                  )}
                </div>
                <div className="text-neutral-600 text-[10.5px]">
                  {t.last_used_at
                    ? `dernier usage ${timeAgoFr(t.last_used_at)}`
                    : `connecté ${timeAgoFr(t.created_at)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(t.account_email)}
                disabled={revoking}
                className="inline-flex items-center gap-1 text-neutral-500 hover:text-red-300 text-[11px] disabled:opacity-50"
                title="Révoquer ce compte"
              >
                {revoking ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                Révoquer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatModal({
  provider,
  title,
  subtitle,
  helpUrl,
  helpText,
  onClose,
  onSubmit,
}: {
  provider: string;
  title: string;
  subtitle: string;
  helpUrl: string;
  helpText: string;
  onClose: () => void;
  onSubmit: (token: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim().length < 10) {
      setError('Token trop court');
      return;
    }
    setSubmitting(true);
    setError(null);
    const r = await onSubmit(token.trim());
    if (!r.ok) {
      setError(r.error ?? 'Erreur inconnue');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-onyx border border-white/10 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-neutral-light text-sm font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <X size={16} />
          </button>
        </div>
        <p className="text-neutral-400 text-[12px] mb-3">{subtitle}</p>

        <label className="block mb-3">
          <span className="text-neutral-400 text-[11px] mb-1 block">
            Personal Access Token ({provider})
          </span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={provider === 'github' ? 'github_pat_...' : '...'}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light font-mono outline-none focus:border-admin-accent/50"
            required
          />
        </label>

        <p className="text-neutral-600 text-[10.5px] mb-3">
          {helpText}{' '}
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-admin-accent hover:underline"
          >
            Générer un PAT →
          </a>
        </p>

        {error && (
          <p className="mb-3 text-red-300 text-[11.5px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-1.5">
            <AlertCircle size={11} />
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border border-white/10 text-neutral-300 hover:bg-white/5 text-[12px] rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || token.trim().length < 10}
            className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-2 rounded-lg transition"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
            {submitting ? 'Validation...' : 'Connecter'}
          </button>
        </div>
      </form>
    </div>
  );
}
