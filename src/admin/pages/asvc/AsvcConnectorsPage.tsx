import { useState } from 'react';
import { Mail, Github, Plug, CheckCircle2, AlertCircle, Loader2, X, Key, Triangle, CreditCard, Server, MessageCircle, ShieldAlert, Linkedin } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useOAuthTokens, useEnvConnectorsStatus, timeAgoFr } from './hooks';
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
  {
    provider: 'vercel',
    label: 'Vercel',
    description: 'Résolution preview URL + promotion preview→production par DevOps/Release Agent. Vercel auto-déploie depuis git push; le connecteur récupère et promeut.',
    Icon: Triangle,
    scopes: 'read+write deployments, projects',
    setupNote: 'Génère un token sur vercel.com/account/tokens (scope: Full Account ou par-projet). Si compte Team, exporter ASVC_VERCEL_TEAM_ID côté Supabase Edge Functions env.',
    auth_kind: 'pat',
  },
  {
    provider: 'sentry',
    label: 'Sentry',
    description: 'Monitoring post-deploy par DevOps Agent. Cron post_deploy_monitor interroge Sentry toutes les N min, déclenche un rollback si error_rate > seuil. Crée des incidents asvc_production_incidents auto.',
    Icon: ShieldAlert,
    scopes: 'org:read project:read event:read',
    setupNote: 'Génère un token sur sentry.io/settings/account/api/auth-tokens/ avec les scopes org:read, project:read, event:read. Pour self-hosted, exporter ASVC_SENTRY_HOST côté Supabase. Seuil event rate ajustable via ASVC_DEPLOY_ERROR_RATE_THRESHOLD (défaut 0.5 events/min).',
    auth_kind: 'pat',
  },
  {
    provider: 'linkedin',
    label: 'LinkedIn',
    description: 'Publication des posts Content Agent sur LinkedIn (UGC Posts). Token valide 60j (LinkedIn n\'émet pas de refresh — reconnexion manuelle à expiration).',
    Icon: Linkedin,
    scopes: 'openid profile email w_member_social',
    setupNote: 'Setup Meta (LinkedIn) : créer app sur linkedin.com/developers, requérir le produit "Share on LinkedIn" (approval 24-48h), récupérer Client ID + Secret, configurer Redirect URI: /functions/v1/asvc-oauth-linkedin-callback. Configurer LINKEDIN_OAUTH_CLIENT_ID + LINKEDIN_OAUTH_CLIENT_SECRET côté Supabase env.',
    auth_kind: 'oauth',
  },
];

export default function AsvcConnectorsPage() {
  const { tokens, loading, startGmailOAuth, startLinkedinOAuth, setPat, revoke, revoking } = useOAuthTokens();
  const { status: envStatus } = useEnvConnectorsStatus();
  const [patModalOpen, setPatModalOpen] = useState<null | 'github' | 'vercel' | 'sentry'>(null);

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
            } else if (meta.auth_kind === 'oauth' && meta.provider === 'linkedin') {
              startLinkedinOAuth();
            } else if (meta.auth_kind === 'pat' && (meta.provider === 'github' || meta.provider === 'vercel' || meta.provider === 'sentry')) {
              setPatModalOpen(meta.provider);
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

      <section className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Server size={14} className="text-admin-accent" />
          <h2 className="text-neutral-light text-[13px] font-semibold">
            Connecteurs configurés côté serveur (env vars)
          </h2>
        </div>
        <p className="text-neutral-400 text-[12px] mb-3">
          Pour les services à API key fixe (paiements, monitoring), la configuration
          se fait dans <em>Supabase Edge Functions → Secrets</em>. Le statut ci-dessous
          reflète ce que le serveur voit en ce moment.
        </p>

        <div className="space-y-2">
          <EnvConnectorCard
            Icon={CreditCard}
            label="CinetPay"
            description="Génère un lien Mobile Money / Carte attaché aux relances factures. Webhook public marque l'invoice paid après vérification."
            configured={envStatus?.cinetpay.configured ?? false}
            envKeys={['CINETPAY_API_KEY', 'CINETPAY_SITE_ID']}
            extraNote="Configurer côté Supabase Edge Functions → Secrets. notify_url à enregistrer côté CinetPay : /functions/v1/asvc-payment-webhook-cinetpay"
          />
          <EnvConnectorCard
            Icon={CreditCard}
            label="Stripe"
            description="Paiements internationaux (cartes USD/EUR via Checkout Session). Sélectionné automatiquement quand le client est hors UEMOA/CEMAC. Webhook vérifie la signature avant tout update."
            configured={envStatus?.stripe.configured ?? false}
            envKeys={['STRIPE_SECRET_KEY', 'ASVC_STRIPE_WEBHOOK_SECRET']}
            extraNote="Configurer côté Supabase Edge Functions → Secrets. Endpoint webhook à enregistrer côté Stripe Dashboard → Webhooks : /functions/v1/asvc-payment-webhook-stripe (event checkout.session.completed). ASVC_STRIPE_WEBHOOK_SECRET distinct de STRIPE_WEBHOOK_SECRET (billing principal) pour éviter les conflits."
          />
          <EnvConnectorCard
            Icon={MessageCircle}
            label="WhatsApp Business"
            description="Canal SAV / SDR n°1 en UEMOA. Tickets entrants automatiquement créés (source='whatsapp'). Réponses Support N1 routées via WA quand le ticket est WhatsApp. Outbound SDR via send_whatsapp_message."
            configured={envStatus?.whatsapp.configured ?? false}
            envKeys={['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET']}
            extraNote="Setup Meta : (1) developers.facebook.com → créer app Business + ajouter produit WhatsApp. (2) Ajouter un numéro WA Business, récupérer le PHONE_NUMBER_ID. (3) Générer System User Token (Business Manager). (4) Configurer Webhook → URL /functions/v1/asvc-whatsapp-webhook, verify token = celui dans WHATSAPP_WEBHOOK_VERIFY_TOKEN. (5) Subscribe au champ 'messages'. Webhook config = 2 secrets distincts : verify_token (handshake GET) + app_secret (signature POST)."
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-onyx-light/20 p-5">
        <h2 className="text-neutral-light text-[13px] font-semibold mb-2">
          Connecteurs à venir
        </h2>
        <ul className="text-neutral-400 text-[12px] space-y-1.5 list-disc list-inside marker:text-admin-accent">
          <li><strong>X / Meta (Instagram, Facebook)</strong> — publication des posts Content Agent sur les autres canaux</li>
          <li><strong>Apollo / LinkedIn Sales Nav</strong> — enrichissement leads pour Prospection Agent</li>
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

      {patModalOpen === 'vercel' && (
        <PatModal
          provider="vercel"
          title="Connecter Vercel"
          subtitle="Colle un token API Vercel"
          helpUrl="https://vercel.com/account/tokens"
          helpText="Génère un token sur vercel.com/account/tokens (scope Full Account ou scopes spécifiques projets atlas-studio/*). Pour un compte Team, exporter ASVC_VERCEL_TEAM_ID côté Supabase env."
          onClose={() => setPatModalOpen(null)}
          onSubmit={async (token) => {
            const r = await setPat('vercel', token);
            if (r.ok) {
              setPatModalOpen(null);
              return { ok: true };
            }
            return { ok: false, error: r.error };
          }}
        />
      )}

      {patModalOpen === 'sentry' && (
        <PatModal
          provider="sentry"
          title="Connecter Sentry"
          subtitle="Colle un Auth Token Sentry"
          helpUrl="https://sentry.io/settings/account/api/auth-tokens/"
          helpText="Génère un token sur sentry.io avec les scopes : org:read, project:read, event:read. Pour Sentry self-hosted, configure ASVC_SENTRY_HOST côté Supabase env."
          onClose={() => setPatModalOpen(null)}
          onSubmit={async (token) => {
            const r = await setPat('sentry', token);
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

function EnvConnectorCard({
  Icon,
  label,
  description,
  configured,
  envKeys,
  extraNote,
  soon = false,
}: {
  Icon: typeof CreditCard;
  label: string;
  description: string;
  configured: boolean;
  envKeys: string[];
  extraNote?: string;
  soon?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-neutral-500'
        }`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-neutral-light text-[13.5px] font-semibold">{label}</h3>
            {configured ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                <CheckCircle2 size={10} /> Configuré
              </span>
            ) : soon ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                À venir
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <AlertCircle size={10} /> À configurer
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-[12px] leading-relaxed mb-2">{description}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {envKeys.map((k) => (
              <span
                key={k}
                className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  configured
                    ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5'
                    : 'border-white/10 text-neutral-500'
                }`}
              >
                {configured ? '✓' : '○'} {k}
              </span>
            ))}
          </div>
          {extraNote && (
            <p className="text-neutral-600 text-[10.5px] italic flex items-start gap-1.5">
              <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
              {extraNote}
            </p>
          )}
        </div>
      </div>
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
