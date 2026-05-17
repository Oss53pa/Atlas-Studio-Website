import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
  Agent,
  AgentAction,
  AgentActionWithAgent,
  ActionStatus,
  CooBrief,
  KillSwitch,
  Ticket,
  TicketMessage,
  ClientLifecycle,
  OutreachGoal,
  ContentEntry,
  ContentChannel,
  LeadPipelineRow,
  SdrChannel,
  OverdueInvoice,
  FinanceDashboard,
  ReminderLevel,
  AccountingFlowKind,
  PipelineSummary,
  HealthCheck,
  AuditIntegrity,
  DeployEnvironment,
  SignalSource,
  AgentReadiness,
  TestCase,
  TestStatus,
  SharedTemplateRow,
  TechDebtPriorityRow,
  TechDebtStatus,
  CodeHealthAudit,
} from './types';

// Toutes les listes pendantes (à valider par la CEO)
const PENDING_STATUSES: ActionStatus[] = ['proposed', 'consolidated'];

export function useArbitrations() {
  const [actions, setActions] = useState<AgentActionWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('asvc_agent_actions')
      .select('*, agent:asvc_agents!asvc_agent_actions_agent_id_fkey(code,name,department)')
      .in('status', PENDING_STATUSES)
      .order('criticality', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) setError(err.message);
    else setActions((data as unknown as AgentActionWithAgent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const approve = useCallback(async (id: string, note?: string) => {
    const { error: err } = await supabase
      .from('asvc_agent_actions')
      .update({
        status: 'approved',
        validated_by: 'pame',
        validated_at: new Date().toISOString(),
        validation_note: note ?? null,
      })
      .eq('id', id);
    if (err) throw err;
    await fetchActions();
  }, [fetchActions]);

  const reject = useCallback(async (id: string, note?: string) => {
    const { error: err } = await supabase
      .from('asvc_agent_actions')
      .update({
        status: 'rejected',
        validated_by: 'pame',
        validated_at: new Date().toISOString(),
        validation_note: note ?? null,
      })
      .eq('id', id);
    if (err) throw err;
    await fetchActions();
  }, [fetchActions]);

  const modify = useCallback(async (id: string, modifiedPayload: Record<string, unknown>, note?: string) => {
    const { error: err } = await supabase
      .from('asvc_agent_actions')
      .update({
        status: 'modified',
        modified_payload: modifiedPayload,
        validated_by: 'pame',
        validated_at: new Date().toISOString(),
        validation_note: note ?? null,
      })
      .eq('id', id);
    if (err) throw err;
    await fetchActions();
  }, [fetchActions]);

  return { actions, loading, error, refresh: fetchActions, approve, reject, modify };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('asvc_agents')
        .select('*')
        .order('department')
        .order('name');
      if (!cancelled) {
        setAgents((data as unknown as Agent[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { agents, loading };
}
export function useAgentStats(days = 7) {
  const [stats, setStats] = useState<Record<string, AgentActionStats>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('asvc_action_stats', { p_days: days });
    const map: Record<string, AgentActionStats> = {};
    for (const row of (data as AgentActionStats[] | null) ?? []) {
      map[row.agent_code] = row;
    }
    setStats(map);
    setLoading(false);
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}

export function useBriefsHistory(limit = 50) {
  const [briefs, setBriefs] = useState<CooBrief[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('asvc_coo_briefs')
      .select('*')
      .order('brief_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    setBriefs((data as unknown as CooBrief[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { briefs, loading, refresh };
}



export function useLatestBrief(briefType: 'morning' | 'evening' = 'morning') {
  const [brief, setBrief] = useState<CooBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from('asvc_coo_briefs')
      .select('*')
      .eq('brief_type', briefType)
      .order('brief_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    setBrief((data as unknown as CooBrief) ?? null);
    setLoading(false);
  }, [briefType]);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Session manquante');

      const { data, error: invokeErr } = await supabase.functions.invoke('asvc-coo-brief', {
        body: { type: briefType },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (invokeErr) throw new Error(invokeErr.message);
      if (data?.error) throw new Error(data.error);
      await fetchLatest();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [briefType, fetchLatest]);

  return { brief, loading, generating, error, generate, refresh: fetchLatest };
}

export function useActionsLog(limit = 100) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('asvc_agent_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!cancelled) {
        setActions((data as unknown as AgentAction[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { actions, loading };
}

export function useKillSwitches() {
  const [switches, setSwitches] = useState<KillSwitch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('asvc_kill_switch')
      .select('*')
      .order('activated_at', { ascending: false });
    setSwitches((data as unknown as KillSwitch[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activate = useCallback(
    async (scope: 'all' | 'department' | 'agent', target: string | null, reason: string) => {
      const { error: err } = await supabase.from('asvc_kill_switch').insert({
        scope,
        target,
        is_active: true,
        reason,
        activated_by: 'pame',
      });
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  const deactivate = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('asvc_kill_switch')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    await refresh();
  }, [refresh]);

  return { switches, loading, refresh, activate, deactivate };
}

// ───────────────────────────────────────────────────────────────────────────
// Tickets ASVC
// ───────────────────────────────────────────────────────────────────────────

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('asvc_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setTickets((data as unknown as Ticket[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { tickets, loading, refresh };
}

export function useTicketDetail(ticketId: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setMessages([]);
      return;
    }
    setLoading(true);
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('asvc_tickets').select('*').eq('id', ticketId).maybeSingle(),
      supabase
        .from('asvc_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
    ]);
    setTicket((t as unknown as Ticket) ?? null);
    setMessages((m as unknown as TicketMessage[]) ?? []);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { refresh(); }, [refresh]);

  const invokeAgent = useCallback(
    async (fnName: 'asvc-support-n1' | 'asvc-bug-triage') => {
      if (!ticketId) return;
      setDrafting(true);
      setDraftError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');

        const { data, error: invokeErr } = await supabase.functions.invoke(fnName, {
          body: { ticket_id: ticketId },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (invokeErr) throw new Error(invokeErr.message);
        if (data?.error) throw new Error(data.error);
      } catch (e) {
        setDraftError((e as Error).message);
      } finally {
        setDrafting(false);
      }
    },
    [ticketId],
  );

  const requestDraft = useCallback(() => invokeAgent('asvc-support-n1'), [invokeAgent]);
  const requestBugTriage = useCallback(() => invokeAgent('asvc-bug-triage'), [invokeAgent]);

  return {
    ticket,
    messages,
    loading,
    drafting,
    draftError,
    refresh,
    requestDraft,
    requestBugTriage,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Customer Success
// ───────────────────────────────────────────────────────────────────────────

export function useClientsLifecycle(limit = 100) {
  const [rows, setRows] = useState<ClientLifecycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc('asvc_clients_lifecycle', { p_limit: limit });
    if (err) setError(err.message);
    else setRows((data as unknown as ClientLifecycle[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  const triggerOutreach = useCallback(async (clientId: string, goal: OutreachGoal) => {
    setPendingClientId(clientId);
    setOutreachError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Session manquante');

      const { data, error: invokeErr } = await supabase.functions.invoke('asvc-customer-success', {
        body: { client_id: clientId, goal },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (invokeErr) throw new Error(invokeErr.message);
      if (data?.error) throw new Error(data.error);
      await refresh();
    } catch (e) {
      setOutreachError((e as Error).message);
    } finally {
      setPendingClientId(null);
    }
  }, [refresh]);

  return { rows, loading, error, refresh, triggerOutreach, pendingClientId, outreachError };
}

// ───────────────────────────────────────────────────────────────────────────
// Content (Marketing)
// ───────────────────────────────────────────────────────────────────────────

export function useContentCalendar() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('asvc_content_calendar')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setEntries((data as unknown as ContentEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const draftNew = useCallback(
    async (channel: ContentChannel, topic: string, scheduledAt?: string, context?: string) => {
      setGenerating(true);
      setGenError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');

        const { data, error: invokeErr } = await supabase.functions.invoke('asvc-content', {
          body: { channel, topic, scheduled_at: scheduledAt, context },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (invokeErr) throw new Error(invokeErr.message);
        if (data?.error) throw new Error(data.error);
        await refresh();
      } catch (e) {
        setGenError((e as Error).message);
        throw e;
      } finally {
        setGenerating(false);
      }
    },
    [refresh],
  );

  return { entries, loading, generating, genError, refresh, draftNew };
}

// ───────────────────────────────────────────────────────────────────────────
// Sales pipeline
// ───────────────────────────────────────────────────────────────────────────

export type SalesAgentKind = 'prospection' | 'sdr' | 'closer';

export function useLeadsPipeline() {
  const [rows, setRows] = useState<LeadPipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('asvc_leads_pipeline', { p_limit: 200 });
    if (!error) setRows((data as unknown as LeadPipelineRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const invokeSales = useCallback(
    async (
      kind: SalesAgentKind,
      leadId: string,
      payload?: { channel?: SdrChannel; step?: string; custom_angle?: string },
    ) => {
      setPendingLeadId(leadId);
      setActionError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');

        const fnName =
          kind === 'prospection' ? 'asvc-prospection' :
          kind === 'sdr' ? 'asvc-sdr' :
          'asvc-closer';

        const body: Record<string, unknown> = { lead_id: leadId };
        if (kind === 'sdr') {
          body.channel = payload?.channel ?? 'email';
          if (payload?.step) body.step = payload.step;
          if (payload?.custom_angle) body.custom_angle = payload.custom_angle;
        }

        const { data, error: invokeErr } = await supabase.functions.invoke(fnName, {
          body,
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (invokeErr) throw new Error(invokeErr.message);
        if (data?.error) throw new Error(data.error);
        await refresh();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setPendingLeadId(null);
      }
    },
    [refresh],
  );

  return { rows, loading, refresh, invokeSales, pendingLeadId, actionError };
}

// ───────────────────────────────────────────────────────────────────────────
// Finance
// ───────────────────────────────────────────────────────────────────────────

export function useOverdueInvoices() {
  const [rows, setRows] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('asvc_overdue_invoices', { p_limit: 100 });
    setRows((data as unknown as OverdueInvoice[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const draftReminder = useCallback(
    async (invoiceId: string, level: ReminderLevel) => {
      setPendingId(invoiceId);
      setActionError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');
        const { data, error: err } = await supabase.functions.invoke('asvc-billing', {
          body: { invoice_id: invoiceId, level },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (err) throw new Error(err.message);
        if (data?.error) throw new Error(data.error);
        await refresh();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setPendingId(null);
      }
    },
    [refresh],
  );

  const suggestJournal = useCallback(
    async (invoiceId: string, flowKind: AccountingFlowKind) => {
      setPendingId(invoiceId);
      setActionError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');
        const { data, error: err } = await supabase.functions.invoke('asvc-accounting', {
          body: { invoice_id: invoiceId, flow_kind: flowKind },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (err) throw new Error(err.message);
        if (data?.error) throw new Error(data.error);
        await refresh();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setPendingId(null);
      }
    },
    [refresh],
  );

  return { rows, loading, refresh, draftReminder, suggestJournal, pendingId, actionError };
}

export function useTreasury() {
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('asvc_finance_dashboard');
    setDashboard((data as unknown as FinanceDashboard) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const triggerBrief = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Session manquante');
      const { data, error: err } = await supabase.functions.invoke('asvc-treasury', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(data.error);
      await refresh();
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [refresh]);

  return { dashboard, loading, generating, genError, refresh, triggerBrief };
}

// ───────────────────────────────────────────────────────────────────────────
// v2.0 — Pipeline Produit (Kanban)
// ───────────────────────────────────────────────────────────────────────────

export function usePipelineSummary() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('asvc_pipeline_summary');
    if (err) setError(err.message);
    else setSummary(data as unknown as PipelineSummary);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const invokeRdProd = useCallback(
    async (fnName: string, body: Record<string, unknown>) => {
      setPending(true);
      setActionError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');
        const { data, error: err } = await supabase.functions.invoke(fnName, {
          body,
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (err) throw new Error(err.message);
        if (data?.error) throw new Error(data.error);
        await refresh();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const detectSignal = useCallback(
    (source: SignalSource, signalText: string) =>
      invokeRdProd('asvc-veille', { source, signal_text: signalText }),
    [invokeRdProd],
  );

  const launchResearch = useCallback(
    (opportunityId: string) =>
      invokeRdProd('asvc-user-research', { opportunity_id: opportunityId }),
    [invokeRdProd],
  );

  const draftSpec = useCallback(
    (opportunityId: string) =>
      invokeRdProd('asvc-product-designer', { opportunity_id: opportunityId }),
    [invokeRdProd],
  );

  const draftDev = useCallback(
    (specId: string, repo: string) =>
      invokeRdProd('asvc-dev', { spec_id: specId, repo }),
    [invokeRdProd],
  );

  const runQa = useCallback(
    (prId: string) => invokeRdProd('asvc-qa', { pr_id: prId }),
    [invokeRdProd],
  );

  const prepareDeploy = useCallback(
    (prId: string, environment: DeployEnvironment, appName: string) =>
      invokeRdProd('asvc-devops-release', {
        pr_id: prId,
        environment,
        app_name: appName,
      }),
    [invokeRdProd],
  );

  return {
    summary,
    loading,
    error,
    refresh,
    pending,
    actionError,
    detectSignal,
    launchResearch,
    draftSpec,
    draftDev,
    runQa,
    prepareDeploy,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// v2.0 — Health check + audit integrity
// ───────────────────────────────────────────────────────────────────────────

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [integrity, setIntegrity] = useState<AuditIntegrity | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('asvc_health_check');
    setHealth(data as unknown as HealthCheck);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const verifyAuditChain = useCallback(async (limit = 1000) => {
    setVerifying(true);
    try {
      const { data } = await supabase.rpc('asvc_verify_audit_chain', { p_limit: limit });
      setIntegrity(data as unknown as AuditIntegrity);
    } finally {
      setVerifying(false);
    }
  }, []);

  return { health, loading, refresh, verifying, integrity, verifyAuditChain };
}

// ───────────────────────────────────────────────────────────────────────────
// Annexe C — Tests readiness par agent
// ───────────────────────────────────────────────────────────────────────────

export function useAgentReadiness() {
  const [rows, setRows] = useState<AgentReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_asvc_agent_readiness')
        .select('*')
        .order('department')
        .order('agent_code');
      if (err) {
        console.error('[useAgentReadiness] error', err);
        setError(err.message);
      } else {
        setRows((data as unknown as AgentReadiness[]) ?? []);
      }
    } catch (e) {
      console.error('[useAgentReadiness] thrown', e);
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { rows, loading, error, refresh };
}

export function useTestCases(agentCode: string | null) {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentCode) {
      setCases([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = supabase
        .from('asvc_agent_test_cases')
        .select('*')
        .order('is_critical', { ascending: false })
        .order('category')
        .order('test_id');

      const { data, error: err } =
        agentCode === '_transverse'
          ? await query.is('agent_code', null)
          : await query.eq('agent_code', agentCode);

      if (err) {
        console.error('[useTestCases] error', err);
        setError(err.message);
      } else {
        setCases((data as unknown as TestCase[]) ?? []);
      }
    } catch (e) {
      console.error('[useTestCases] thrown', e);
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [agentCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const recordResult = useCallback(
    async (testCase: TestCase, status: TestStatus, notes?: string) => {
      setPendingId(testCase.id);
      setError(null);
      try {
        const { error: err } = await supabase.rpc('asvc_record_test_result', {
          p_agent_code: testCase.agent_code,
          p_test_id: testCase.test_id,
          p_status: status,
          p_notes: notes ?? null,
        });
        if (err) throw err;
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPendingId(null);
      }
    },
    [refresh],
  );

  return { cases, loading, error, refresh, recordResult, pendingId };
}

// ───────────────────────────────────────────────────────────────────────────
// Annexe F — Templates partagés (asvc_agent_memory_shared)
// ───────────────────────────────────────────────────────────────────────────

export function useSharedTemplates() {
  const [rows, setRows] = useState<SharedTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('asvc_agent_memory_shared')
        .select('id, key, value, description, updated_at')
        .like('key', 'template_%')
        .order('key');
      if (err) {
        console.error('[useSharedTemplates] error', err);
        setError(err.message);
      } else {
        setRows((data as unknown as SharedTemplateRow[]) ?? []);
      }
    } catch (e) {
      console.error('[useSharedTemplates] thrown', e);
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateTemplate = useCallback(
    async (id: string, value: SharedTemplateRow['value']) => {
      setSaving(true);
      setError(null);
      try {
        const nextValue = {
          ...value,
          version: typeof value.version === 'number' ? value.version + 1 : 2,
        };
        const { error: err } = await supabase
          .from('asvc_agent_memory_shared')
          .update({ value: nextValue, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (err) throw err;
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  return { rows, loading, error, refresh, updateTemplate, saving };
}

export function usePendingExecutions() {
  const [rows, setRows] = useState<PendingExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<BatchExecutionSummary | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('asvc_pending_executions', { p_limit: 100 });
    if (err) setError(err.message);
    else setRows((data as unknown as PendingExecution[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const executeBatch = useCallback(
    async (actionIds: string[]) => {
      if (actionIds.length === 0) return;
      setExecuting(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');

        const { data, error: invokeErr } = await supabase.functions.invoke('asvc-execute-action', {
          body: { action_ids: actionIds },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (invokeErr) throw new Error(invokeErr.message);
        if (data?.error) throw new Error(data.error);

        const summary = data?.summary as BatchExecutionSummary | undefined;
        const results = data?.results as ExecutionResult[] | undefined;
        if (summary) setLastSummary(summary);
        await refresh();

        // Si un seul a échoué, surface l'erreur la plus parlante
        const firstError = results?.find((r) => !r.ok && r.error)?.error;
        if (firstError) setError(firstError);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setExecuting(false);
      }
    },
    [refresh],
  );

  const executeOne = useCallback(
    (actionId: string) => executeBatch([actionId]),
    [executeBatch],
  );

  return { rows, loading, executing, error, lastSummary, refresh, executeOne, executeBatch };
}

// ───────────────────────────────────────────────────────────────────────────
// OAuth Connectors
// ───────────────────────────────────────────────────────────────────────────

export function useOAuthTokens() {
  const [tokens, setTokens] = useState<OAuthToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('asvc_oauth_list');
    setTokens((data as unknown as OAuthToken[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Écoute les messages window.postMessage envoyés par le popup de callback
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object' && (e.data as { type?: string }).type === 'asvc-oauth-connected') {
        refresh();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [refresh]);

  const startOAuth = useCallback(async (kind: 'gmail' | 'linkedin' | 'meta') => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      alert('Session manquante');
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) {
      alert('VITE_SUPABASE_URL introuvable');
      return;
    }
    const startUrl = kind === 'linkedin'
      ? `${supabaseUrl}/functions/v1/asvc-oauth-linkedin-start`
      : kind === 'meta'
        ? `${supabaseUrl}/functions/v1/asvc-oauth-meta-start`
        : `${supabaseUrl}/functions/v1/asvc-oauth-start?provider=gmail`;
    let location: string | null = null;
    try {
      const res = await fetch(startUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      location = res.headers.get('location');
      if (!location) {
        const text = await res.text().catch(() => '');
        alert(`OAuth start a échoué : ${text.slice(0, 200)}`);
        return;
      }
    } catch (e) {
      alert(`OAuth start failed: ${(e as Error).message}`);
      return;
    }
    const popup = window.open(location, 'asvc-oauth', 'width=520,height=680');
    if (!popup) alert('Popup bloqué — autorise les popups pour ce site');
  }, []);

  const startGmailOAuth = useCallback(() => startOAuth('gmail'), [startOAuth]);
  const startLinkedinOAuth = useCallback(() => startOAuth('linkedin'), [startOAuth]);
  const startMetaOAuth = useCallback(() => startOAuth('meta'), [startOAuth]);

  const revoke = useCallback(
    async (provider: string, accountEmail: string) => {
      if (!confirm(`Révoquer le connecteur ${provider} pour ${accountEmail} ?`)) return;
      setRevoking(true);
      try {
        await supabase.rpc('asvc_oauth_revoke', {
          p_provider: provider,
          p_account_email: accountEmail,
        });
        await refresh();
      } finally {
        setRevoking(false);
      }
    },
    [refresh],
  );

  // Stocke un PAT. Renvoie {ok, error?, account?}
  const setPat = useCallback(
    async (provider: 'github' | 'vercel' | 'sentry' | 'apollo', token: string): Promise<{ ok: boolean; account?: string; error?: string }> => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return { ok: false, error: 'Session manquante' };

        const { data, error: invokeErr } = await supabase.functions.invoke('asvc-oauth-pat-set', {
          body: { provider, token },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (invokeErr) return { ok: false, error: invokeErr.message };
        if (data?.error) return { ok: false, error: data.error };
        await refresh();
        return { ok: true, account: data?.account_email };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
    [refresh],
  );

  return { tokens, loading, refresh, startGmailOAuth, startLinkedinOAuth, startMetaOAuth, revoke, revoking, setPat };
}

// ───────────────────────────────────────────────────────────────────────────
// Env-based connectors (CinetPay, Stripe, etc.) status
// ───────────────────────────────────────────────────────────────────────────

export interface ConnectorStatusEnv {
  cinetpay: { configured: boolean; site_id_present: boolean; api_key_present: boolean };
  stripe: { configured: boolean; api_key_present: boolean; webhook_secret_present?: boolean };
  whatsapp: {
    configured: boolean;
    token_present: boolean;
    phone_number_id_present: boolean;
    webhook_configured: boolean;
  };
  gmail_oauth: { configured: boolean; client_id_present: boolean };
  linkedin_oauth: { configured: boolean; client_id_present: boolean };
  meta_oauth: { configured: boolean; client_id_present: boolean };
  mintlify: { configured: boolean; repo_present: boolean; repo: string | null };
  encryption: { configured: boolean };
}

export function useEnvConnectorsStatus() {
  const [status, setStatus] = useState<ConnectorStatusEnv | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      if (!supabaseUrl) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/asvc-connectors-status`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, refresh };
}

// ───────────────────────────────────────────────────────────────────────────
// Vacation mode + Auto-approve patterns
// ───────────────────────────────────────────────────────────────────────────

export function useVacationMode() {
  const [status, setStatus] = useState<VacationStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('asvc_get_vacation_status');
    if (err) setError(err.message);
    else setStatus((data as VacationStatus | null) ?? { enabled: false });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(
    async (start: string, end: string, behavior: 'strict' | 'moderate' | 'full_pause') => {
      setSaving(true);
      setError(null);
      try {
        const { error: err } = await supabase.rpc('asvc_set_vacation_mode', {
          p_start: start,
          p_end: end,
          p_behavior: behavior,
        });
        if (err) throw new Error(err.message);
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const disable = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.rpc('asvc_disable_vacation_mode');
      if (err) throw new Error(err.message);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  return { status, loading, saving, error, enable, disable };
}

export function useAutoApprovePatterns(threshold = 5) {
  const [candidates, setCandidates] = useState<AutoApproveCandidate[]>([]);
  const [patterns, setPatterns] = useState<AutoApprovePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.rpc('asvc_get_autoapprove_candidates', { p_threshold: threshold }),
      supabase.rpc('asvc_list_autoapprove_patterns'),
    ]);
    setCandidates((c.data as AutoApproveCandidate[] | null) ?? []);
    setPatterns((p.data as AutoApprovePattern[] | null) ?? []);
    setLoading(false);
  }, [threshold]);

  useEffect(() => { refresh(); }, [refresh]);

  const setPattern = useCallback(
    async (agentCode: string, actionType: string, criticality: Criticality, enabled: boolean) => {
      setSaving(true);
      try {
        await supabase.rpc('asvc_set_autoapprove_pattern', {
          p_agent_code: agentCode,
          p_action_type: actionType,
          p_criticality: criticality,
          p_enabled: enabled,
        });
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  return { candidates, patterns, loading, saving, refresh, setPattern };
}

// ─── Agent prompts (versionnés en DB) ──────────────────────────────────────
export function useAgentPromptVersions(agentCode: string | null) {
  const [versions, setVersions] = useState<AgentPromptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentCode) {
      setVersions([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('asvc_list_agent_prompt_versions', {
      p_agent_code: agentCode,
    });
    if (err) setError(err.message);
    setVersions((data as AgentPromptVersion[] | null) ?? []);
    setLoading(false);
  }, [agentCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const createVersion = useCallback(
    async (content: string, notes: string | null) => {
      if (!agentCode) return;
      setSaving(true);
      setError(null);
      try {
        const { error: err } = await supabase.rpc('asvc_create_agent_prompt_version', {
          p_agent_code: agentCode,
          p_content: content,
          p_notes: notes,
        });
        if (err) throw err;
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [agentCode, refresh],
  );

  const activateVersion = useCallback(
    async (promptId: string) => {
      setSaving(true);
      setError(null);
      try {
        const { error: err } = await supabase.rpc('asvc_activate_agent_prompt', {
          p_prompt_id: promptId,
        });
        if (err) throw err;
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const deactivateActive = useCallback(async () => {
    if (!agentCode) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.rpc('asvc_deactivate_agent_prompt', {
        p_agent_code: agentCode,
      });
      if (err) throw err;
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [agentCode, refresh]);

  return { versions, loading, saving, error, refresh, createVersion, activateVersion, deactivateActive };
}

// ───────────────────────────────────────────────────────────────────────────
// ASVC v2.1 — Tech Debt Agent
// ───────────────────────────────────────────────────────────────────────────

export function useTechDebtPriority() {
  const [rows, setRows] = useState<TechDebtPriorityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanSummary, setLastScanSummary] = useState<{
    apps_scanned: number;
    total_items_detected: number;
    total_critical: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_asvc_tech_debt_priority')
        .select('*');
      if (err) {
        console.error('[useTechDebtPriority] error', err);
        setError(err.message);
      } else {
        setRows((data as unknown as TechDebtPriorityRow[]) ?? []);
      }
    } catch (e) {
      console.error('[useTechDebtPriority] thrown', e);
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateStatus = useCallback(
    async (id: string, status: TechDebtStatus, notes?: string) => {
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'fixed') patch.resolved_at = new Date().toISOString();
      if (notes) patch.resolution_notes = notes;
      const { error: err } = await supabase
        .from('asvc_tech_debt_items')
        .update(patch)
        .eq('id', id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  const triggerScan = useCallback(
    async (mode: 'full' | 'internal_only' | 'lighthouse_only' = 'full') => {
      setScanning(true);
      setScanError(null);
      setLastScanSummary(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Session manquante');

        const { data, error: err } = await supabase.functions.invoke('asvc-tech-debt-scan', {
          body: { mode },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (err) throw new Error(err.message);
        if (data?.error) throw new Error(data.error);
        if (data?.summary) setLastScanSummary(data.summary);
        await refresh();
      } catch (e) {
        setScanError((e as Error).message);
      } finally {
        setScanning(false);
      }
    },
    [refresh],
  );

  return {
    rows, loading, error, refresh, updateStatus,
    scanning, scanError, lastScanSummary, triggerScan,
  };
}

export function useCodeHealthAudits(daysWindow = 30) {
  const [latest, setLatest] = useState<CodeHealthAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - daysWindow * 86400000).toISOString().slice(0, 10);
      const { data, error: err } = await supabase
        .from('asvc_code_health_audits')
        .select('*')
        .gte('audit_date', since)
        .order('audit_date', { ascending: false })
        .order('app_concerned');
      if (err) {
        console.error('[useCodeHealthAudits] error', err);
        setError(err.message);
      } else {
        // Pour chaque app : ne garder que le dernier audit
        const byApp: Record<string, CodeHealthAudit> = {};
        for (const row of (data as unknown as CodeHealthAudit[]) ?? []) {
          if (!byApp[row.app_concerned]) byApp[row.app_concerned] = row;
        }
        setLatest(Object.values(byApp));
      }
    } catch (e) {
      console.error('[useCodeHealthAudits] thrown', e);
      setError((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [daysWindow]);

  useEffect(() => { refresh(); }, [refresh]);

  return { latest, loading, error, refresh };
}

// Helper: temps relatif en fr
export function timeAgoFr(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}
