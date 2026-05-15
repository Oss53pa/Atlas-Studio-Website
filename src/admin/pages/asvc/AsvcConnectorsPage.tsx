import { Mail, Plug, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useOAuthTokens, timeAgoFr } from './hooks';
import type { OAuthToken } from './types';

interface ConnectorMeta {
  provider: string;
  label: string;
  description: string;
  Icon: typeof Mail;
  scopes: string;
  setupNote: string;
}

const CONNECTORS: ConnectorMeta[] = [
  {
    provider: 'gmail',
    label: 'Gmail',
    description: 'Envoi des emails approuvés (réponses tickets, SDR outreach, relances factures, propositions commerciales).',
    Icon: Mail,
    scopes: 'gmail.send + openid email',
    setupNote: 'Requiert GOOGLE_OAUTH_CLIENT_ID / SECRET configurés côté Supabase Edge Functions. Le compte connecté envoie depuis son adresse propre.',
  },
];

export default function AsvcConnectorsPage() {
  const { tokens, loading, startGmailOAuth, revoke, revoking } = useOAuthTokens();

  const tokenFor = (provider: string) =>
    tokens.filter((t) => t.provider === provider && t.status === 'active');

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Connecteurs"
        subtitle="Connexions OAuth aux services externes — refresh tokens chiffrés AES-256, jamais exposés"
      />

      <div className="mb-5 rounded-lg border border-white/5 bg-onyx-light/20 p-3 text-[12px] text-neutral-400">
        <Plug size={13} className="inline mr-1.5" />
        Les actions approuvées par la CEO restent en base tant qu'aucun connecteur n'est configuré.
        Une fois Gmail connecté, les action_types <em>send_ticket_response</em>, <em>send_customer_email</em>,
        <em> send_sdr_email</em>, <em>send_invoice_reminder</em>, <em>send_commercial_proposal</em> seront
        envoyés via Gmail au moment de l'exécution.
      </div>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      <div className="space-y-4">
        {CONNECTORS.map((meta) => {
          const active = tokenFor(meta.provider);
          return (
            <ConnectorCard
              key={meta.provider}
              meta={meta}
              tokens={active}
              revoking={revoking}
              onConnect={meta.provider === 'gmail' ? startGmailOAuth : undefined}
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
          <li><strong>GitHub MCP</strong> — push réel des PRs Dev Agent + création issues Bug Triage</li>
          <li><strong>Vercel</strong> — déploiements production réels (préparés par DevOps Agent)</li>
          <li><strong>LinkedIn / X / Meta</strong> — publication des posts Content Agent</li>
          <li><strong>CinetPay / Stripe</strong> — paiements et webhooks pour Facturation Agent</li>
          <li><strong>WhatsApp Business</strong> — réponses Support N1 et SDR sur ce canal</li>
        </ul>
      </section>
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
  onConnect?: () => void;
  onRevoke: (email: string) => void;
}) {
  const connected = tokens.length > 0;

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
          </div>
          <p className="text-neutral-400 text-[12px] leading-relaxed mb-1">{meta.description}</p>
          <p className="text-neutral-600 text-[10.5px]">
            Scopes : <code className="text-admin-accent/80">{meta.scopes}</code>
          </p>
        </div>

        {onConnect && (
          <button
            type="button"
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition flex-shrink-0"
          >
            <Plug size={12} />
            {connected ? 'Ajouter un compte' : 'Connecter'}
          </button>
        )}
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
