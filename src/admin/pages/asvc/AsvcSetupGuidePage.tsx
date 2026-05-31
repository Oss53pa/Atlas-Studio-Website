import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, Circle, ArrowRight, BookOpen, Plug, Database,
  KeyRound, ShieldCheck, Settings, Activity, Mail, Github, Triangle,
  ShieldAlert, UserSearch, MessageCircle, CreditCard, Linkedin, Facebook,
  BookText,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useEnvConnectorsStatus, useOAuthTokens, useHealthCheck } from './hooks';

type TabId = 'infra' | 'connectors' | 'data' | 'tuning' | 'agents';

const TABS: { id: TabId; label: string }[] = [
  { id: 'infra', label: '1. Infrastructure' },
  { id: 'connectors', label: '2. Connecteurs' },
  { id: 'data', label: '3. Données' },
  { id: 'tuning', label: '4. Tuning' },
  { id: 'agents', label: 'Agents (capacités)' },
];

interface Proph3tHealth {
  env_vars: {
    GROQ_API_KEY: boolean;
    OLLAMA_URL: boolean;
    APP_ENCRYPTION_KEY: boolean;
    GEMINI_API_KEY_FALLBACK: boolean;
    ANTHROPIC_API_KEY: boolean;
    ASVC_ANTHROPIC_API_KEY: boolean;
    CRON_SHARED_SECRET: boolean;
  };
  diagnostic: {
    groq_ready: boolean;
    anthropic_ready: boolean;
    llm_provider_ready: boolean;
    cron_ready: boolean;
  };
}

function useProph3tHealth() {
  const [health, setHealth] = useState<Proph3tHealth | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        if (!url) { setLoading(false); return; }
        const res = await fetch(`${url}/functions/v1/proph3t-health`);
        if (!cancelled && res.ok) setHealth(await res.json());
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  return { health, loading };
}

export default function AsvcSetupGuidePage() {
  const { status: envStatus, loading: envLoading } = useEnvConnectorsStatus();
  const { tokens } = useOAuthTokens();
  const { health } = useHealthCheck();
  const { health: prophet } = useProph3tHealth();
  const [tab, setTab] = useState<TabId>('infra');

  const migrationsLikelyDone = (health?.audit_log?.total_entries ?? 0) > 0;
  const edgeFunctionsLikelyDeployed = !!health;
  const encryptionReady = prophet?.env_vars.APP_ENCRYPTION_KEY ?? envStatus?.encryption?.configured ?? false;
  const llmReady = prophet?.diagnostic.llm_provider_ready ?? false;
  const cronReady = prophet?.diagnostic.cron_ready ?? false;

  const hasToken = (provider: string) =>
    tokens.some((t) => t.provider === provider && t.status === 'active');

  const connectors: Array<{ provider: string; label: string; configured: boolean; Icon: typeof Mail }> = [
    { provider: 'gmail', label: 'Gmail', configured: !!envStatus?.gmail_oauth.configured && hasToken('gmail'), Icon: Mail },
    { provider: 'github', label: 'GitHub', configured: hasToken('github'), Icon: Github },
    { provider: 'vercel', label: 'Vercel', configured: hasToken('vercel'), Icon: Triangle },
    { provider: 'sentry', label: 'Sentry', configured: hasToken('sentry'), Icon: ShieldAlert },
    { provider: 'apollo', label: 'Apollo', configured: hasToken('apollo'), Icon: UserSearch },
    { provider: 'linkedin', label: 'LinkedIn', configured: !!envStatus?.linkedin_oauth.configured && hasToken('linkedin'), Icon: Linkedin },
    { provider: 'meta', label: 'Meta (FB/IG)', configured: !!envStatus?.meta_oauth.configured && hasToken('meta'), Icon: Facebook },
    { provider: 'whatsapp', label: 'WhatsApp', configured: !!envStatus?.whatsapp.configured, Icon: MessageCircle },
    { provider: 'cinetpay', label: 'CinetPay', configured: !!envStatus?.cinetpay.configured, Icon: CreditCard },
    { provider: 'stripe', label: 'Stripe', configured: !!envStatus?.stripe.configured, Icon: CreditCard },
    { provider: 'mintlify', label: 'Mintlify', configured: !!envStatus?.mintlify.configured && hasToken('github'), Icon: BookText },
  ];

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Guide de démarrage ASVC"
        subtitle="Les étapes concrètes pour passer du framework technique à une entreprise qui tourne"
      />

      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12.5px] text-amber-200">
        <strong className="text-amber-300">⚠ ASVC ne crée pas ton business — il l'opère.</strong>
        <p className="mt-1 text-amber-100/80 leading-relaxed">
          Le code est prêt. Mais les agents ne peuvent rien faire sans : (1) clés API configurées,
          (2) comptes connectés, (3) données réelles (leads, clients, tickets) à traiter.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-white/10">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-[12.5px] font-semibold rounded-t-lg transition-colors -mb-px border-b-2 ${
                active
                  ? 'text-admin-accent border-admin-accent bg-admin-accent/5'
                  : 'text-neutral-400 border-transparent hover:text-neutral-light hover:bg-white/[0.03]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'infra' && (
        <TabBody subtitle="Sans ça, les agents ne tournent pas du tout.">
          <Step
            icon={KeyRound}
            title="Clé LLM (Groq ou Anthropic)"
            status={llmReady ? 'done' : 'manual'}
            desc={
              llmReady
                ? `Provider actif détecté : ${[
                    prophet?.env_vars.GROQ_API_KEY && 'GROQ_API_KEY',
                    prophet?.env_vars.ANTHROPIC_API_KEY && 'ANTHROPIC_API_KEY',
                    prophet?.env_vars.ASVC_ANTHROPIC_API_KEY && 'ASVC_ANTHROPIC_API_KEY',
                  ].filter(Boolean).join(', ')}. Les 21 agents passent par un routeur qui choisit automatiquement.`
                : "Configure GROQ_API_KEY (recommandé pour démarrer, free tier) ou ANTHROPIC_API_KEY côté Supabase Edge Functions → Secrets. Les 21 agents utilisent un routeur qui prend ce qui est dispo."
            }
            link={{ label: 'console.groq.com/keys', url: 'https://console.groq.com/keys' }}
          />
          <Step
            icon={ShieldCheck}
            title="Encryption key (PATs/OAuth tokens)"
            status={encryptionReady ? 'done' : 'manual'}
            desc="Chaîne aléatoire 32+ caractères stockée dans APP_ENCRYPTION_KEY (Supabase Edge Functions → Secrets). Chiffre les tokens OAuth/PAT en DB."
          />
          <Step
            icon={Activity}
            title="Cron shared secret"
            status={cronReady ? 'done' : 'manual'}
            desc={
              cronReady
                ? 'CRON_SHARED_SECRET configuré côté Supabase. Pense aussi à le coller dans GitHub Actions → secrets pour que le workflow ASVC Cron puisse appeler les edge functions.'
                : 'Chaîne aléatoire 32+ caractères à configurer CRON_SHARED_SECRET côté Supabase ET côté GitHub Actions secrets. Permet aux crons d\'appeler les edge functions sans JWT.'
            }
          />
          <Step
            icon={Database}
            title="Migrations Supabase poussées"
            status={migrationsLikelyDone ? 'done' : 'manual'}
            desc="Lance supabase db push depuis ton terminal local (ou laisse la CI sur main le faire). Crée les 40+ tables ASVC + triggers + RPCs."
          />
          <Step
            icon={Plug}
            title="Edge functions déployées"
            status={edgeFunctionsLikelyDeployed ? 'done' : 'manual'}
            desc="Lance supabase functions deploy --no-verify-jwt pour les ~35 fonctions ASVC. La CI sur main peut le faire automatiquement."
          />
        </TabBody>
      )}

      {tab === 'connectors' && (
        <TabBody subtitle="Chaque connecteur débloque des capacités d'exécution. Sans connecteur, les agents restent en mode 'draft'.">
          <div className="rounded-lg border border-white/10 bg-onyx-light/20 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {envLoading && <p className="text-neutral-500 text-[12px]">Chargement statuts...</p>}
              {!envLoading && connectors.map((c) => (
                <div
                  key={c.provider}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded border ${
                    c.configured
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-white/10 bg-onyx-light/30'
                  }`}
                >
                  <c.Icon size={14} className={c.configured ? 'text-emerald-300' : 'text-neutral-500'} />
                  <span className={`text-[12px] font-semibold ${c.configured ? 'text-emerald-300' : 'text-neutral-400'}`}>
                    {c.label}
                  </span>
                  {c.configured ? (
                    <CheckCircle2 size={12} className="text-emerald-300 ml-auto" />
                  ) : (
                    <Circle size={12} className="text-neutral-600 ml-auto" />
                  )}
                </div>
              ))}
            </div>
            <Link
              to="/admin/asvc/connectors"
              className="inline-flex items-center gap-1.5 mt-3 text-admin-accent hover:underline text-[12px] font-semibold"
            >
              Configurer les connecteurs <ArrowRight size={12} />
            </Link>
          </div>

          <Step
            icon={AlertCircle}
            title="App Review Meta (Facebook + Instagram)"
            status="manual"
            desc="Délai 1-2 semaines. Requiert Business Verification + revue des scopes pages_manage_posts + instagram_content_publish. À démarrer dès que possible si tu veux poster en auto sur FB/IG."
            link={{ label: 'developers.facebook.com', url: 'https://developers.facebook.com/apps' }}
          />
          <Step
            icon={AlertCircle}
            title="App Review LinkedIn 'Share on LinkedIn'"
            status="manual"
            desc="Délai 24-48h. Requiert le produit 'Share on LinkedIn' approuvé pour pouvoir poster via UGC API. Sinon Content Agent peut drafter mais pas publier."
            link={{ label: 'linkedin.com/developers', url: 'https://www.linkedin.com/developers/apps' }}
          />
        </TabBody>
      )}

      {tab === 'data' && (
        <TabBody subtitle="Les agents ne créent pas de leads — ils les traitent. Tu dois leur donner du grain à moudre.">
          <Step
            icon={UserSearch}
            title="Premier leads dans asvc_leads"
            status="manual"
            desc="Source possible : formulaire de contact du site, import CSV, scraping manuel d'événements pros. Prospection Agent peut ensuite qualifier BANT, puis SDR enchaîne en outreach."
          />
          <Step
            icon={MessageCircle}
            title="Premiers tickets SAV"
            status="manual"
            desc="Branche le formulaire de contact / WhatsApp webhook (déjà configuré côté Edge) sur asvc_tickets. Support N1 + Bug Triage prennent ensuite le relais."
          />
          <Step
            icon={CreditCard}
            title="Catalogue tarifaire + clients"
            status="manual"
            desc="Renseigne asvc_ceo_preferences (grille tarifaire) + crée tes premiers clients dans asvc_clients. Customer Success + Facturation + Tresorerie tournent alors avec du vrai cash en jeu."
          />
        </TabBody>
      )}

      {tab === 'tuning' && (
        <TabBody subtitle="Les prompts par défaut sont fonctionnels mais génériques. La vraie valeur vient du tuning sur tes vrais cas.">
          <Step
            icon={Settings}
            title="Tester chaque agent sur 5-10 cas réels"
            status="manual"
            desc="Pour chaque agent, regarde 5-10 drafts produits sur tes vraies données. Note ce qui cloche (ton, structure, manque d'info). Édite le prompt via System Prompts en DB → recommence."
          />
          <Step
            icon={BookOpen}
            title="System Prompts en DB (sans redeploy)"
            status="done"
            desc="Tu peux éditer les system prompts depuis l'UI. Chaque modif crée une nouvelle version active. Tu peux revert en 1 clic. Cache 5 min."
            link={{ label: 'Page System Prompts', url: '/admin/asvc/agent-prompts' }}
          />
          <Step
            icon={ShieldCheck}
            title="Activer auto-approve sur patterns sûrs"
            status="done"
            desc="Une fois qu'un agent + action_type produit du bon résultat 80%+ du temps, active l'auto-approve via Préférences CEO. Réduit ta charge de validation."
            link={{ label: 'Page Préférences', url: '/admin/asvc/settings' }}
          />
        </TabBody>
      )}

      {tab === 'agents' && (
        <div>
          <p className="text-neutral-400 text-[12.5px] mb-4 leading-relaxed">
            Statut "✅ Prêt" = peut générer un draft maintenant (LLM + DB). Statut "🔌 Ship" = peut
            réellement exécuter une action externe (envoyer email, push GitHub, etc.) — dépend des
            connecteurs configurés.
          </p>
          <div className="space-y-5">
            <AgentDept title="🏛️ Direction" agents={[
              { code: 'coo', name: 'COO Agent', does: 'Synthétise briefs matin (07h) / soir (18h) / hebdo (lundi 06h30). Pas de LLM call direct — templates avec données live.', needs: 'Données dans la DB (actions, tickets, leads, etc.)', status: 'ready_internal' },
            ]} />
            <AgentDept title="🛒 Ventes" agents={[
              { code: 'prospection', name: 'Prospection Agent', does: 'Qualifie BANT (Budget/Authority/Need/Timeline) sur un lead, identifie fits produit, suggère next stage (MQL/SQL).', needs: 'Leads dans asvc_leads. Apollo (optionnel — enrichit avec titre/société/effectif).', status: 'ready_internal' },
              { code: 'sdr', name: 'SDR Agent', does: 'Drafts emails/DMs LinkedIn/WhatsApp d\'outreach (first touch, follow-ups, breakup).', needs: 'Pour ship réel : Gmail / LinkedIn / WhatsApp configurés.', status: 'ship_required' },
              { code: 'closer', name: 'Closer Agent', does: 'Drafts propositions commerciales structurées (problème, solution, prix, échéancier).', needs: 'Pour ship réel : Gmail configuré.', status: 'ship_required' },
            ]} />
            <AgentDept title="💼 SAV" agents={[
              { code: 'support_n1', name: 'Support Agent N1', does: 'Drafts réponses tickets (FAQ, troubleshooting, how-to). Détecte triggers d\'escalade.', needs: 'Tickets dans asvc_tickets. Pour ship : Gmail (si source=email) ou WhatsApp (si source=whatsapp).', status: 'ship_required' },
              { code: 'customer_success', name: 'Customer Success Agent', does: 'Drafts emails lifecycle : onboarding J+1/J+7/J+30, churn check, upsell.', needs: 'Clients dans asvc_clients avec stage (d1/d7/d30/churn_risk/upsell). Pour ship : Gmail.', status: 'ship_required' },
              { code: 'bug_triage', name: 'Bug Triage Agent', does: 'Qualifie bug (P0/P1/P2/P3), drafts issue GitHub formatée avec repro/logs.', needs: 'Tickets type bug + error_logs. Pour ship : GitHub PAT.', status: 'ship_required' },
            ]} />
            <AgentDept title="📢 Marketing" agents={[
              { code: 'content', name: 'Content Agent', does: 'Drafts posts LinkedIn / X / Instagram / Facebook / newsletter / article blog selon brand voice.', needs: 'Pour ship réel : LinkedIn (UGC) ET/OU Meta (FB/IG). X = payant non câblé.', status: 'ship_required' },
              { code: 'community', name: 'Community Agent', does: 'Modère commentaires/DMs sociaux, escalade troll/sensible, drafts réponses.', needs: 'Pour ship : Meta (FB/IG comments). Aujourd\'hui mode draft uniquement.', status: 'ship_required' },
            ]} />
            <AgentDept title="💰 Finance" agents={[
              { code: 'facturation', name: 'Facturation Agent', does: 'Drafts relances graduées (level 1 friendly → level 5 mise en demeure). Génère lien paiement.', needs: 'Factures dans asvc_invoices. Pour ship : Gmail + CinetPay (UEMOA/CEMAC) ou Stripe (international).', status: 'ship_required' },
              { code: 'compta', name: 'Compta Agent', does: 'Suggère écritures SYSCOHADA pour chaque facture (compte/libellé/débit/crédit). Validation CEO avant import Atlas Finance.', needs: 'Factures dans asvc_invoices. Pas de connecteur — sortie = JSON pour import manuel.', status: 'ready_internal' },
              { code: 'tresorerie', name: 'Tresorerie Agent', does: 'Brief trésorerie quotidien (cash position, runway, alertes seuils, recommandations).', needs: 'Snapshot finance dans la DB. Tourne en cron daily 06h UTC.', status: 'ready_internal' },
            ]} />
            <AgentDept title="🔬 R&D / Production" agents={[
              { code: 'veille', name: 'Veille Agent', does: 'Qualifie une opportunité (new_app / new_feature / pivot / integration) avec scoring RICE.', needs: 'Signal en input (texte libre). 100% LLM — pas de connecteur.', status: 'ready_internal' },
              { code: 'user_research', name: 'User Research Agent', does: 'Approfondit une opportunité validée : research brief, feedbacks SAV, template interview.', needs: 'Opportunité dans asvc_opportunities + tickets associés.', status: 'ready_internal' },
              { code: 'product_designer', name: 'Product Designer Agent', does: 'Produit spec complète (vision, user stories, archi, wireframes Mermaid).', needs: 'Opportunité + research brief. Sortie = asvc_product_specs.', status: 'ready_internal' },
              { code: 'dev', name: 'Dev Agent', does: 'Drafts plan d\'implémentation par fichiers, structure de PR, checklist tests QA.', needs: 'Spec validée. Pour ship réel : GitHub PAT (pour pousser le plan + ouvrir PR draft).', status: 'ship_required' },
              { code: 'qa', name: 'QA Agent', does: 'Génère plan de tests détaillés (unit / integration / e2e / sécurité / SYSCOHADA si finance).', needs: 'PR ou spec. Pas de connecteur — sortie = asvc_test_runs pour CI.', status: 'ready_internal' },
              { code: 'devops_release', name: 'DevOps/Release Agent', does: 'Pipeline deploy avec triple gate (QA passed + Preview CEO approved + 0 incident P0/P1). Confirmation typée obligatoire pour prod.', needs: 'Pour ship : Vercel PAT (deploy) + GitHub PAT (tags/rollback) + Sentry PAT (post-deploy monitor).', status: 'ship_required' },
              { code: 'documentation', name: 'Documentation Agent', does: 'Drafts MDX : user guide / API ref / changelog / release notes / admin guide / troubleshooting.', needs: 'App + version. Pour ship : GitHub PAT + ASVC_MINTLIFY_DOCS_REPO.', status: 'ship_required' },
            ]} />
          </div>
        </div>
      )}

      {/* Footer rapide visible sur tous les onglets */}
      <div className="mt-10 rounded-xl border border-admin-accent/30 bg-admin-accent/5 p-5">
        <h3 className="text-admin-accent text-[14px] font-semibold mb-2">Checklist rapide</h3>
        <ol className="text-neutral-300 text-[12.5px] space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Configure les <strong>3 secrets Supabase critiques</strong> (clé LLM, Encryption, Cron) — onglet Infrastructure.</li>
          <li>Pousse les <strong>migrations</strong> et <strong>déploie les edge functions</strong> via la CI.</li>
          <li>Connecte <strong>1 connecteur</strong> pour commencer (Gmail recommandé : active SAV + SDR + Facturation).</li>
          <li>Importe ou crée <strong>10 leads</strong> dans <code>asvc_leads</code> → lance Prospection sur le premier.</li>
          <li>Regarde le draft → tune le prompt si besoin → valide → laisse SDR enchaîner.</li>
          <li>Démarre <strong>App Review Meta + LinkedIn</strong> en parallèle (semaines de délai).</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function TabBody({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-neutral-500 text-[12px] mb-4">{subtitle}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

type StepStatus = 'done' | 'manual' | 'pending';

function Step({
  icon: Icon, title, status, desc, link,
}: {
  icon: typeof Mail;
  title: string;
  status: StepStatus;
  desc: string;
  link?: { label: string; url: string };
}) {
  const StatusIcon = status === 'done' ? CheckCircle2 : status === 'manual' ? AlertCircle : Circle;
  const statusColor = status === 'done' ? 'text-emerald-300' : status === 'manual' ? 'text-amber-300' : 'text-neutral-500';
  const statusLabel = status === 'done' ? 'OK' : status === 'manual' ? 'À faire' : 'En attente';

  const isExternal = link?.url.startsWith('http');

  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/30 p-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded bg-admin-accent/10 text-admin-accent flex items-center justify-center flex-shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-neutral-light text-[12.5px] font-semibold">{title}</h3>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusColor}`}>
            <StatusIcon size={11} />
            {statusLabel}
          </span>
        </div>
        <p className="text-neutral-400 text-[11.5px] leading-relaxed">{desc}</p>
        {link && (
          isExternal ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-admin-accent hover:underline text-[11px]"
            >
              {link.label} ↗
            </a>
          ) : (
            <Link
              to={link.url}
              className="inline-flex items-center gap-1 mt-1.5 text-admin-accent hover:underline text-[11px]"
            >
              {link.label} <ArrowRight size={10} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}

interface AgentInfo {
  code: string;
  name: string;
  does: string;
  needs: string;
  status: 'ready_internal' | 'ship_required';
}

function AgentDept({ title, agents }: { title: string; agents: AgentInfo[] }) {
  return (
    <div>
      <h3 className="text-neutral-light text-[13px] font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        {agents.map((a) => (
          <div key={a.code} className="rounded-lg border border-white/10 bg-onyx-light/30 p-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-neutral-light text-[12.5px] font-semibold">{a.name}</span>
              <code className="text-[10px] text-neutral-500 font-mono">{a.code}</code>
              {a.status === 'ready_internal' ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  <CheckCircle2 size={9} />
                  Prêt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded">
                  <Plug size={9} />
                  Ship nécessite connecteur
                </span>
              )}
            </div>
            <p className="text-neutral-400 text-[11.5px] leading-relaxed">{a.does}</p>
            <p className="text-neutral-500 text-[10.5px] italic mt-1">→ {a.needs}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
