// ASVC — Atlas Studio Virtual Company
// Types TS miroir du schema Supabase (asvc_*)

export type Department = 'direction' | 'sav' | 'marketing' | 'ventes' | 'finance';

// ───────────────────────────────────────────────────────────────────────────
// Connecteurs OAuth
// ───────────────────────────────────────────────────────────────────────────

export interface AgentActionStats {
  agent_code: string;
  agent_name: string;
  department: Department;
  total: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  approval_rate: number;
  avg_validation_minutes: number;
}

export interface VacationStatus {
  enabled: boolean;
  active_now?: boolean;
  start?: string;
  end?: string;
  behavior?: 'strict' | 'moderate' | 'full_pause';
}

export interface AutoApproveCandidate {
  agent_code: string;
  action_type: string;
  criticality: 'low' | 'normal' | 'high' | 'critical';
  consecutive_approvals: number;
  last_decision_at: string;
  already_auto_approved: boolean;
}

export interface AutoApprovePattern {
  agent_code: string;
  action_type: string;
  criticality: 'low' | 'normal' | 'high' | 'critical';
  enabled: boolean;
  set_at: string;
}

export interface OAuthToken {
  provider: string;
  account_email: string;
  account_label: string | null;
  status: 'active' | 'revoked' | 'expired';
  scope: string | null;
  last_used_at: string | null;
  last_refresh_at: string | null;
  created_at: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Execution orchestrator
// ───────────────────────────────────────────────────────────────────────────

export type ExecutionKind = 'internal' | 'external' | 'unknown';

export interface PendingExecution {
  action_id: string;
  action_type: string;
  criticality: Criticality;
  title: string;
  agent_code: string | null;
  approved_at: string | null;
  execution_kind: ExecutionKind;
}

export interface ExecutionResult {
  action_id: string;
  ok: boolean;
  kind?: 'internal' | 'external_required';
  result?: unknown;
  error?: string;
}

export interface BatchExecutionSummary {
  total: number;
  succeeded_internal: number;
  pending_external: number;
  failed: number;
}

// ───────────────────────────────────────────────────────────────────────────
// v2.0 — Pipeline Produit (R&D + Production)
// ───────────────────────────────────────────────────────────────────────────

export interface PipelineIdea {
  id: string;
  title: string;
  category: string | null;
  rice_score: number | null;
  effort_estimate: string | null;
  created_at: string;
}

export interface PipelineResearch {
  id: string;
  title: string;
  opportunity_id: string;
  created_at: string;
  has_brief: boolean;
}

export interface PipelineSpec {
  id: string;
  title: string;
  spec_version: string;
  story_points: number | null;
  estimated_weeks: number | null;
  status: string;
  created_at: string;
}

export interface PipelinePr {
  id: string;
  title: string;
  repo: string;
  branch_name: string;
  github_pr_url: string | null;
  qa_status: string;
  test_coverage_percent?: number | null;
  status: string;
  created_at: string;
}

export interface PipelineDeployment {
  id: string;
  app_name: string;
  environment: string;
  deployment_url: string | null;
  status: string;
  approved_by_ceo: boolean;
  created_at: string;
  pr_title: string | null;
}

export interface PipelineIncident {
  id: string;
  app_concerned: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  status: string;
  detected_at: string;
}

export interface PipelineSummary {
  as_of: string;
  ideas: PipelineIdea[];
  research: PipelineResearch[];
  specs: PipelineSpec[];
  build: PipelinePr[];
  qa: PipelinePr[];
  release: PipelineDeployment[];
  recent_incidents: PipelineIncident[];
  counts: {
    ideas: number;
    research: number;
    specs: number;
    build: number;
    qa: number;
    release: number;
    open_incidents: number;
  };
}

export type DeployEnvironment = 'preview' | 'staging' | 'production';

export type SignalSource =
  | 'competitor_watch'
  | 'customer_feedback'
  | 'regulation_change'
  | 'market_trend'
  | 'internal_idea';

export const SIGNAL_SOURCE_LABELS: Record<SignalSource, string> = {
  competitor_watch: 'Veille concurrentielle',
  customer_feedback: 'Feedback client',
  regulation_change: 'Évolution réglementaire',
  market_trend: 'Tendance marché',
  internal_idea: 'Idée interne',
};

// ───────────────────────────────────────────────────────────────────────────
// v2.0 — Hardening / Health
// ───────────────────────────────────────────────────────────────────────────

export interface HealthCheck {
  as_of: string;
  agents: {
    total: number;
    active: number;
    paused: number;
    by_department: Record<string, number>;
  };
  sessions_24h: {
    total: number;
    completed: number;
    failed: number;
    total_tokens: number;
    total_cost_usd: number;
  };
  actions_24h: {
    proposed: number;
    approved: number;
    rejected: number;
    pending_now: number;
    pending_critical: number;
  };
  kill_switches_active: number;
  audit_log: {
    total_entries: number;
    last_entry_at: string | null;
    entries_24h: number;
  };
  last_brief: {
    brief_type: string;
    brief_date: string;
    created_at: string;
    arbitrations_pending: number;
    arbitrations_urgent: number;
  } | null;
}

export interface AuditIntegrity {
  total_entries_scanned: number;
  entries_valid: number;
  mismatch_count: number;
  integrity_ok: boolean;
  mismatches: Array<{
    id: string;
    ts: string;
    event_type: string;
    expected_hash: string;
    actual_hash: string;
  }>;
  verified_at: string;
}

export type ReminderLevel =
  | 'pre_due'
  | 'level_1_friendly'
  | 'level_2_firm'
  | 'level_3_formal'
  | 'level_4_final'
  | 'level_5_legal';

export type AccountingFlowKind = 'invoice_issued' | 'invoice_paid' | 'invoice_partial_payment';

export interface OverdueInvoice {
  invoice_id: string;
  invoice_number: string;
  client_id: string | null;
  client_name: string;
  amount_ttc_fcfa: number;
  issued_date: string;
  due_date: string;
  days_overdue: number;
  reminder_count: number;
  last_reminder_at: string | null;
  suggested_level: ReminderLevel;
  status: string;
}

export interface FinanceDashboard {
  as_of: string;
  revenue: {
    invoiced_mtd_fcfa: number;
    paid_mtd_fcfa: number;
    paid_last_30d_fcfa: number;
    paid_last_90d_fcfa: number;
  };
  receivables: {
    outstanding_fcfa: number;
    overdue_fcfa: number;
    overdue_count: number;
    due_next_7d_fcfa: number;
    dso_avg_days: number;
  };
  pipeline_potential_fcfa: number;
  mrr_estimate_fcfa: number;
  recent_overdue: Array<{
    invoice_number: string;
    client_name: string;
    amount_ttc_fcfa: number;
    due_date: string;
    days_overdue: number;
  }>;
}

export const REMINDER_LEVEL_LABELS: Record<ReminderLevel, string> = {
  pre_due: 'Avant échéance',
  level_1_friendly: 'L1 amical',
  level_2_firm: 'L2 ferme',
  level_3_formal: 'L3 formel',
  level_4_final: 'L4 final',
  level_5_legal: 'L5 contentieux',
};

export const REMINDER_LEVEL_CLASSES: Record<ReminderLevel, string> = {
  pre_due: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  level_1_friendly: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  level_2_firm: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  level_3_formal: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  level_4_final: 'bg-red-500/15 text-red-300 border-red-500/30',
  level_5_legal: 'bg-red-500/25 text-red-200 border-red-500/40',
};

export type LeadStage =
  | 'prospect'
  | 'mql'
  | 'sql'
  | 'demo_scheduled'
  | 'demo_done'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export type SuggestedNextAction =
  | 'enrich:prospection'
  | 'outreach:sdr'
  | 'prep:closer'
  | 'proposal:closer'
  | 'followup:closer'
  | 'handoff:customer_success'
  | 'archive'
  | 'review';

export interface LeadPipelineRow {
  lead_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  country: string | null;
  sector: string | null;
  size_estimate: string | null;
  product_interest: string[] | null;
  stage: LeadStage;
  score: number;
  contract_value_fcfa: number | null;
  last_touch_at: string | null;
  next_action_due_at: string | null;
  days_in_stage: number;
  interactions_count: number;
  last_interaction_outcome: string | null;
  suggested_next_action: SuggestedNextAction;
  created_at: string;
}

export type SdrChannel = 'email' | 'linkedin_dm' | 'whatsapp';

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  prospect: 'Prospect',
  mql: 'MQL',
  sql: 'SQL',
  demo_scheduled: 'Démo planifiée',
  demo_done: 'Démo faite',
  proposal_sent: 'Proposition envoyée',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
};

export const LEAD_STAGE_CLASSES: Record<LeadStage, string> = {
  prospect: 'bg-white/5 text-neutral-400 border-white/10',
  mql: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  sql: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  demo_scheduled: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  demo_done: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
  proposal_sent: 'bg-admin-accent/15 text-admin-accent border-admin-accent/30',
  negotiation: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  won: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  lost: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const NEXT_ACTION_LABELS: Record<SuggestedNextAction, string> = {
  'enrich:prospection': 'Enrichir (Prospection)',
  'outreach:sdr': 'Outreach (SDR)',
  'prep:closer': 'Préparer démo',
  'proposal:closer': 'Drafter proposition',
  'followup:closer': 'Relance proposition',
  'handoff:customer_success': 'Handoff CS',
  archive: 'Archiver',
  review: 'À revoir',
};

export type ContentChannel = 'linkedin' | 'x' | 'instagram' | 'facebook' | 'newsletter' | 'blog';
export type ContentStatus = 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'rejected';

export interface ContentEntry {
  id: string;
  agent_id: string | null;
  channel: ContentChannel;
  content_type: string;
  title: string | null;
  content: string;
  media_urls: string[] | null;
  hashtags: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: ContentStatus;
  related_action_id: string | null;
  impressions: number;
  engagements: number;
  clicks: number;
  created_at: string;
}

export const CONTENT_CHANNEL_LABELS: Record<ContentChannel, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  newsletter: 'Newsletter',
  blog: 'Blog',
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Brouillon',
  pending_approval: 'Validation CEO',
  scheduled: 'Programmé',
  published: 'Publié',
  rejected: 'Rejeté',
};

export const CONTENT_STATUS_CLASSES: Record<ContentStatus, string> = {
  draft: 'bg-white/5 text-neutral-400 border-white/10',
  pending_approval: 'bg-admin-accent/15 text-admin-accent border-admin-accent/30',
  scheduled: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  published: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-300 border-red-500/30',
};

export type LifecycleStage =
  | 'd1'
  | 'd7'
  | 'd30'
  | 'trial_ending'
  | 'churn_risk'
  | 'upsell'
  | 'steady'
  | 'churned';

export type OutreachGoal =
  | 'onboarding_d1'
  | 'onboarding_d7'
  | 'onboarding_d30'
  | 'trial_ending'
  | 'churn_check'
  | 'upsell';

export interface ClientLifecycle {
  client_id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  created_at: string;
  stage: LifecycleStage;
  signal_payload: {
    days_since_signup?: number;
    active_subs_count?: number;
    cancelled_subs_count?: number;
    earliest_trial_end?: string | null;
    last_ticket_sentiment?: number | null;
    last_ticket_at?: string | null;
    last_outreach_at?: string | null;
  };
  active_subs: number;
  trial_ends_at: string | null;
  last_ticket_sentiment: number | null;
  last_outreach_at: string | null;
}

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  d1: 'J+1 onboarding',
  d7: 'J+7 check-in',
  d30: 'J+30 activation',
  trial_ending: 'Trial expirant',
  churn_risk: 'Risque churn',
  upsell: 'Upsell',
  steady: 'Stable',
  churned: 'Churn',
};

export const LIFECYCLE_CLASSES: Record<LifecycleStage, string> = {
  churn_risk: 'bg-red-500/15 text-red-300 border-red-500/30',
  trial_ending: 'bg-admin-accent/20 text-admin-accent border-admin-accent/30',
  d1: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  d7: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  d30: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  upsell: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
  steady: 'bg-white/5 text-neutral-400 border-white/10',
  churned: 'bg-white/5 text-neutral-600 border-white/10',
};

// Map stage → goal préférentiel pour l'outreach
export const STAGE_TO_GOAL: Record<LifecycleStage, OutreachGoal | null> = {
  d1: 'onboarding_d1',
  d7: 'onboarding_d7',
  d30: 'onboarding_d30',
  trial_ending: 'trial_ending',
  churn_risk: 'churn_check',
  upsell: 'upsell',
  steady: null,
  churned: null,
};

export type Criticality = 'low' | 'normal' | 'high' | 'critical';

export type ActionStatus =
  | 'proposed'
  | 'consolidated'
  | 'approved'
  | 'modified'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'cancelled';

export type SessionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type BriefType = 'morning' | 'evening' | 'weekly' | 'alert';

export type KillSwitchScope = 'all' | 'department' | 'agent';

export interface Agent {
  id: string;
  code: string;
  name: string;
  department: Department;
  role_description: string;
  system_prompt: string;
  llm_primary: string;
  llm_fallback: string;
  tools: unknown[];
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentSession {
  id: string;
  agent_id: string;
  trigger_type: string;
  trigger_payload: Record<string, unknown> | null;
  parent_session_id: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  tokens_used: number;
  cost_usd: number;
  metadata: Record<string, unknown>;
}

export interface AgentAction {
  id: string;
  session_id: string | null;
  agent_id: string;
  action_type: string;
  criticality: Criticality;
  title: string;
  description: string | null;
  proposed_payload: Record<string, unknown>;
  context: Record<string, unknown>;
  status: ActionStatus;
  validated_by: string | null;
  validated_at: string | null;
  validation_note: string | null;
  modified_payload: Record<string, unknown> | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  execution_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentActionWithAgent extends AgentAction {
  agent?: Pick<Agent, 'code' | 'name' | 'department'> | null;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  ticket_number: string;
  source: string;
  source_message_id: string | null;
  client_email: string | null;
  client_name: string | null;
  client_id: string | null;
  app_concerned: string | null;
  subject: string | null;
  initial_message: string;
  category: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_agent_id: string | null;
  sentiment_score: number | null;
  resolved_at: string | null;
  resolution_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'client' | 'agent' | 'ceo';
  sender_id: string | null;
  content: string;
  attachments: unknown[];
  related_action_id: string | null;
  created_at: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_client: 'Attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgent',
};

export const TICKET_PRIORITY_CLASSES: Record<TicketPriority, string> = {
  urgent: 'bg-red-500/15 text-red-300 border-red-500/30',
  high: 'bg-admin-accent/15 text-admin-accent border-admin-accent/30',
  normal: 'bg-white/5 text-neutral-400 border-white/10',
  low: 'bg-white/5 text-neutral-500 border-white/10',
};

export interface CooBrief {
  id: string;
  brief_type: BriefType;
  brief_date: string;
  summary: string;
  details_markdown: string | null;
  kpis: Record<string, unknown>;
  arbitrations_pending: number;
  arbitrations_urgent: number;
  read_by_ceo: boolean;
  read_at: string | null;
  created_at: string;
}

export interface KillSwitch {
  id: string;
  scope: KillSwitchScope;
  target: string | null;
  is_active: boolean;
  reason: string | null;
  activated_by: string | null;
  activated_at: string;
  deactivated_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  actor_type: 'agent' | 'ceo' | 'system' | 'external';
  actor_id: string;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  prev_hash: string | null;
  hash: string;
}

// ───────────────────────────────────────────────────────────────────────────
// UI helpers : labels FR + classes Tailwind
// ───────────────────────────────────────────────────────────────────────────

export const DEPARTMENT_LABELS: Record<Department, string> = {
  direction: 'Direction',
  sav: 'SAV',
  marketing: 'Marketing',
  ventes: 'Ventes',
  finance: 'Finance',
};

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  critical: 'Urgent',
  high: 'Important',
  normal: 'Normal',
  low: 'Info',
};

export const CRITICALITY_CLASSES: Record<Criticality, string> = {
  critical: 'border-red-500/50 bg-red-500/5',
  high: 'border-admin-accent/50 bg-admin-accent/5',
  normal: 'border-white/10 bg-onyx-light/30',
  low: 'border-white/5 bg-onyx-light/10',
};

export const CRITICALITY_BADGE_CLASSES: Record<Criticality, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-admin-accent/20 text-admin-accent border-admin-accent/30',
  normal: 'bg-white/10 text-neutral-300 border-white/20',
  low: 'bg-white/5 text-neutral-500 border-white/10',
};

export const STATUS_LABELS: Record<ActionStatus, string> = {
  proposed: 'Proposée',
  consolidated: 'Consolidée',
  approved: 'Approuvée',
  modified: 'Modifiée',
  rejected: 'Rejetée',
  executed: 'Exécutée',
  failed: 'Échec',
  cancelled: 'Annulée',
};
