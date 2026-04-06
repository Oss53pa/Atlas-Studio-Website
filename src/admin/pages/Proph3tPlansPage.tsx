import { useState, useEffect } from "react";
import { ListChecks, Check, X, Play, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminModal } from "../components/AdminModal";
import { AdminButton } from "../components/AdminButton";
import { useToast } from "../contexts/ToastContext";

interface AgentPlan {
  id: string;
  trigger_type: string;
  trigger_data: any;
  goal: string;
  steps: { step_number: number; description: string; tool: string; status: string; result?: any }[];
  status: string;
  approved_at: string | null;
  result: any;
  error_message: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "En attente", icon: <Clock size={14} />, color: "bg-amber-500/20 text-amber-400" },
  approved: { label: "Approuvé", icon: <Check size={14} />, color: "bg-blue-500/20 text-blue-400" },
  executing: { label: "En cours", icon: <Play size={14} className="animate-pulse" />, color: "bg-indigo-500/20 text-indigo-400" },
  completed: { label: "Terminé", icon: <CheckCircle2 size={14} />, color: "bg-green-500/20 text-green-400" },
  failed: { label: "Échoué", icon: <XCircle size={14} />, color: "bg-red-500/20 text-red-400" },
  cancelled: { label: "Annulé", icon: <X size={14} />, color: "bg-neutral-500/20 text-neutral-400" },
};

export default function Proph3tPlansPage() {
  const { success, error: showError } = useToast();
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailPlan, setDetailPlan] = useState<AgentPlan | null>(null);

  const fetchPlans = async () => {
    const { data } = await supabase.from("proph3t_agent_plans").select("*").order("created_at", { ascending: false });
    setPlans(data as AgentPlan[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const filtered = plans.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.goal.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const approvePlan = async (plan: AgentPlan) => {
    await supabase.from("proph3t_agent_plans").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", plan.id);
    fetchPlans();
    success("Plan approuvé — Proph3t va l'exécuter");
  };

  const cancelPlan = async (plan: AgentPlan) => {
    await supabase.from("proph3t_agent_plans").update({ status: "cancelled" }).eq("id", plan.id);
    fetchPlans();
    success("Plan annulé");
  };

  const pendingCount = plans.filter(p => p.status === "pending").length;

  const statusFilters = [
    { label: "Tous", value: "all", count: plans.length },
    { label: "En attente", value: "pending", count: pendingCount },
    { label: "En cours", value: "executing", count: plans.filter(p => p.status === "executing").length },
    { label: "Terminés", value: "completed", count: plans.filter(p => p.status === "completed").length },
    { label: "Échoués", value: "failed", count: plans.filter(p => p.status === "failed").length },
  ];

  return (
    <div>
      <AdminPageHeader title="Plans d'action Proph3t" subtitle={`${plans.length} plans — ${pendingCount} en attente d'approbation`} />

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <AdminFilterPills filters={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher un objectif..." />
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">{pendingCount} plan(s) en attente de votre approbation</span>
        </div>
      )}

      <AdminTable
        keyExtractor={(r: AgentPlan) => r.id}
        loading={loading}
        emptyMessage="Aucun plan d'action"
        emptyIcon={<ListChecks size={32} />}
        onRowClick={setDetailPlan}
        columns={[
          { key: "goal", label: "Objectif", render: (r: AgentPlan) => (
            <div className="max-w-[350px]">
              <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium truncate">{r.goal}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.steps?.length || 0} étapes · {r.trigger_type}</div>
            </div>
          )},
          { key: "status", label: "Statut", render: (r: AgentPlan) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
          }},
          { key: "steps", label: "Progression", render: (r: AgentPlan) => {
            const completed = (r.steps || []).filter(s => s.status === "completed").length;
            const total = (r.steps || []).length;
            return (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-warm-bg dark:bg-admin-surface-alt rounded-full overflow-hidden">
                  <div className="h-full bg-gold dark:bg-admin-accent rounded-full" style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }} />
                </div>
                <span className="text-[11px] font-mono text-neutral-muted dark:text-admin-muted">{completed}/{total}</span>
              </div>
            );
          }},
          { key: "created_at", label: "Date", sortable: true, render: (r: AgentPlan) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )},
          { key: "actions", label: "", render: (r: AgentPlan) => (
            r.status === "pending" ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => approvePlan(r)} className="px-2.5 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors flex items-center gap-1"><Check size={12} /> Approuver</button>
                <button onClick={() => cancelPlan(r)} className="px-2.5 py-1 rounded text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><X size={12} /></button>
              </div>
            ) : null
          )},
        ]}
        data={filtered}
      />

      {/* Detail modal */}
      <AdminModal open={!!detailPlan} onClose={() => setDetailPlan(null)} title="Plan d'action" size="lg"
        subtitle={detailPlan?.goal}
        footer={detailPlan?.status === "pending" ? (
          <>
            <AdminButton variant="danger" onClick={() => { cancelPlan(detailPlan!); setDetailPlan(null); }}>Rejeter</AdminButton>
            <AdminButton onClick={() => { approvePlan(detailPlan!); setDetailPlan(null); }}>Approuver</AdminButton>
          </>
        ) : undefined}>
        {detailPlan && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {(() => { const cfg = STATUS_CONFIG[detailPlan.status]; return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>; })()}
              <span className="text-neutral-muted dark:text-admin-muted text-[12px]">{detailPlan.trigger_type} · {new Date(detailPlan.created_at).toLocaleString("fr-FR")}</span>
            </div>

            <div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-2">Étapes du plan</div>
              <div className="space-y-2">
                {(detailPlan.steps || []).map((step, i) => {
                  const stepCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-warm-bg dark:bg-admin-surface-alt rounded-lg">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${step.status === "completed" ? "bg-green-500/20 text-green-400" : step.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-neutral-200 dark:bg-admin-surface text-neutral-500 dark:text-admin-muted"}`}>
                        {step.step_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-neutral-text dark:text-admin-text text-[13px]">{step.description}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-0.5">Outil : <span className="font-mono">{step.tool}</span></div>
                      </div>
                      <span className={`text-[10px] font-semibold ${stepCfg.color} px-2 py-0.5 rounded-full`}>{stepCfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {detailPlan.error_message && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                <div className="text-red-700 dark:text-red-400 text-sm font-medium">Erreur</div>
                <div className="text-red-600 dark:text-red-300 text-[13px] mt-1">{detailPlan.error_message}</div>
              </div>
            )}

            {detailPlan.result && (
              <div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Résultat</div>
                <pre className="bg-warm-bg dark:bg-admin-surface-alt rounded-lg p-4 text-[12px] font-mono overflow-auto max-h-[200px] whitespace-pre-wrap text-neutral-text dark:text-admin-text">
                  {JSON.stringify(detailPlan.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
