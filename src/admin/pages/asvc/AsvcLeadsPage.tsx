import { useMemo, useState } from 'react';
import { Loader2, AlertCircle, Search, Mail, Linkedin, MessageCircle, FileText, Target, ChevronRight } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { usePaged, PaginationBar } from '../../components/PaginationBar';
import { CardListSkeleton } from '../../components/AsvcSkeletons';
import { useLeadsPipeline, timeAgoFr } from './hooks';
import type { SalesAgentKind } from './hooks';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_CLASSES,
  NEXT_ACTION_LABELS,
  type LeadStage,
  type LeadPipelineRow,
  type SdrChannel,
} from './types';

const ACTIONABLE_STAGES: LeadStage[] = ['prospect', 'mql', 'sql', 'demo_scheduled', 'demo_done', 'proposal_sent', 'negotiation'];

type StageFilter = 'actionable' | 'all' | LeadStage;
const STAGE_FILTERS: { id: StageFilter; label: string }[] = [
  { id: 'actionable', label: 'Actifs' },
  { id: 'all', label: 'Tout' },
  { id: 'prospect', label: LEAD_STAGE_LABELS.prospect },
  { id: 'mql', label: LEAD_STAGE_LABELS.mql },
  { id: 'sql', label: LEAD_STAGE_LABELS.sql },
  { id: 'demo_scheduled', label: LEAD_STAGE_LABELS.demo_scheduled },
  { id: 'demo_done', label: LEAD_STAGE_LABELS.demo_done },
  { id: 'proposal_sent', label: LEAD_STAGE_LABELS.proposal_sent },
  { id: 'negotiation', label: LEAD_STAGE_LABELS.negotiation },
  { id: 'won', label: LEAD_STAGE_LABELS.won },
  { id: 'lost', label: LEAD_STAGE_LABELS.lost },
];

function fcfaFmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

export default function AsvcLeadsPage() {
  const { rows, loading, invokeSales, pendingLeadId, actionError } = useLeadsPipeline();
  const [filter, setFilter] = useState<StageFilter>('actionable');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'actionable') return rows.filter((r) => ACTIONABLE_STAGES.includes(r.stage));
    return rows.filter((r) => r.stage === filter);
  }, [rows, filter]);

  const stats = useMemo(() => {
    const pipelineFcfa = rows
      .filter((r) => r.stage === 'proposal_sent' || r.stage === 'negotiation')
      .reduce((sum, r) => sum + (r.contract_value_fcfa ?? 0), 0);
    return {
      total: rows.length,
      actionable: rows.filter((r) => ACTIONABLE_STAGES.includes(r.stage)).length,
      pipelineFcfa,
      wonCount: rows.filter((r) => r.stage === 'won').length,
    };
  }, [rows]);

  const { pageItems, page, setPage, totalPages, total, pageSize } = usePaged(filtered, 20);

  return (
    <div>
      <AdminPageHeader
        title="Pipeline Ventes"
        subtitle="Prospection · SDR · Closer — chaque lead avec l'action suggérée par les agents"
      />

      <div className="flex flex-wrap gap-3 mb-5 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-300">
          <span className="font-semibold">{stats.total}</span>
          <span className="opacity-80">leads total</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-admin-accent/30 bg-admin-accent/10 text-admin-accent">
          <span className="font-semibold">{stats.actionable}</span>
          <span className="opacity-80">actifs</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono">
          {fcfaFmt(stats.pipelineFcfa)} <span className="opacity-80 font-sans">pipeline</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <span className="font-semibold">{stats.wonCount}</span>
          <span className="opacity-80">gagnés</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {STAGE_FILTERS.map((f) => {
          const active = filter === f.id;
          const count =
            f.id === 'all' ? rows.length :
            f.id === 'actionable' ? stats.actionable :
            rows.filter((r) => r.stage === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition ${
                active
                  ? 'bg-admin-accent/15 text-admin-accent border-admin-accent/30'
                  : 'border-white/10 text-neutral-400 hover:bg-white/5'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {actionError}
        </div>
      )}

      {loading && <CardListSkeleton />}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
          <Target size={20} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">Aucun lead pour ce filtre.</p>
          <p className="text-neutral-600 text-[11px] mt-1">
            Les leads peuvent être créés à la main dans AtlasTrade, ou enrichis par l'agent Prospection.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {pageItems.map((r) => (
          <LeadRow
            key={r.lead_id}
            lead={r}
            pending={pendingLeadId === r.lead_id}
            onAction={(kind, payload) => invokeSales(kind, r.lead_id, payload)}
          />
        ))}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
    </div>
  );
}

function LeadRow({
  lead,
  pending,
  onAction,
}: {
  lead: LeadPipelineRow;
  pending: boolean;
  onAction: (kind: SalesAgentKind, payload?: { channel?: SdrChannel; step?: string }) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <div className="flex flex-wrap items-start gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-neutral-light text-[13px] font-medium truncate">
              {lead.company_name}
            </h3>
            <span
              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${LEAD_STAGE_CLASSES[lead.stage]}`}
            >
              {LEAD_STAGE_LABELS[lead.stage]}
            </span>
            {lead.score > 0 && (
              <span className="text-[10px] text-neutral-500">BANT {lead.score}/100</span>
            )}
          </div>
          <div className="text-neutral-500 text-[11px]">
            {lead.contact_name ? `${lead.contact_name} · ` : ''}
            {lead.contact_email ?? '(pas d\'email)'}
            {lead.country && <> · {lead.country}</>}
            {lead.sector && <> · {lead.sector}</>}
          </div>
          <div className="text-neutral-600 text-[10.5px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{lead.interactions_count} interaction{lead.interactions_count > 1 ? 's' : ''}</span>
            <span>{lead.days_in_stage}j dans le stage</span>
            {lead.contract_value_fcfa && (
              <span className="font-mono text-amber-300/80">{fcfaFmt(lead.contract_value_fcfa)}</span>
            )}
            {lead.last_touch_at && <span>touche {timeAgoFr(lead.last_touch_at)}</span>}
            {lead.last_interaction_outcome && (
              <span className="text-neutral-400">→ {lead.last_interaction_outcome}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SuggestedActionButton
            stage={lead.stage}
            suggested={lead.suggested_next_action}
            pending={pending}
            onAction={onAction}
          />
        </div>
      </div>
    </div>
  );
}

function SuggestedActionButton({
  stage,
  suggested,
  pending,
  onAction,
}: {
  stage: LeadStage;
  suggested: LeadPipelineRow['suggested_next_action'];
  pending: boolean;
  onAction: (kind: SalesAgentKind, payload?: { channel?: SdrChannel; step?: string }) => void;
}) {
  // Pour stages 'archive' / 'review' / 'won' (handoff) → pas d'action agent direct ici
  if (suggested === 'archive' || suggested === 'review' || suggested === 'handoff:customer_success') {
    return (
      <span className="text-neutral-600 text-[11px] italic px-2">
        {NEXT_ACTION_LABELS[suggested]}
      </span>
    );
  }

  const label = NEXT_ACTION_LABELS[suggested];

  if (suggested === 'enrich:prospection') {
    return (
      <button
        type="button"
        onClick={() => onAction('prospection')}
        disabled={pending}
        className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 text-onyx font-semibold text-[11.5px] px-2.5 py-1.5 rounded-md transition"
      >
        {pending ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
        {label}
      </button>
    );
  }

  if (suggested === 'outreach:sdr') {
    return (
      <div className="flex gap-1">
        <SdrButton kind="email" pending={pending} onClick={() => onAction('sdr', { channel: 'email' })} />
        <SdrButton kind="linkedin_dm" pending={pending} onClick={() => onAction('sdr', { channel: 'linkedin_dm' })} />
        <SdrButton kind="whatsapp" pending={pending} onClick={() => onAction('sdr', { channel: 'whatsapp' })} />
      </div>
    );
  }

  if (
    suggested === 'proposal:closer' ||
    suggested === 'followup:closer' ||
    suggested === 'prep:closer'
  ) {
    return (
      <button
        type="button"
        onClick={() => onAction('closer')}
        disabled={pending}
        className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 text-onyx font-semibold text-[11.5px] px-2.5 py-1.5 rounded-md transition"
      >
        {pending ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
        {label}
      </button>
    );
  }

  // fallback : action générique
  return (
    <span className="text-neutral-500 text-[11px] inline-flex items-center gap-1">
      <ChevronRight size={11} />
      {label}
      <span className="text-neutral-700 text-[10px]"> ({stage})</span>
    </span>
  );
}

function SdrButton({
  kind,
  pending,
  onClick,
}: {
  kind: SdrChannel;
  pending: boolean;
  onClick: () => void;
}) {
  const config: Record<SdrChannel, { Icon: typeof Mail; label: string }> = {
    email: { Icon: Mail, label: 'Email' },
    linkedin_dm: { Icon: Linkedin, label: 'LinkedIn' },
    whatsapp: { Icon: MessageCircle, label: 'WA' },
  };
  const { Icon, label } = config[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={`SDR Agent — drafter sur ${label}`}
      className="inline-flex items-center gap-1 px-2 py-1.5 border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50 text-[11px] rounded-md transition"
    >
      {pending ? <Loader2 size={10} className="animate-spin" /> : <Icon size={11} />}
      {label}
    </button>
  );
}
