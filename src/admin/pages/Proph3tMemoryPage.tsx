import { useState, useEffect } from "react";
import { Brain, Trash2, RefreshCw, Database, BookMarked, ListChecks } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminButton } from "../components/AdminButton";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

// PROPH3T v2 — page mémoire administrative.
// Le CDC v2 split l'ancienne table proph3t_memory en 3 tables distinctes :
//   - proph3t_observations (KPIs, anomalies, alertes datées par société)
//   - proph3t_business_rules (règles métier auto-générées par feedback)
//   - proph3t_validated_qa (paires Q/R validées par utilisateurs)
// Cette page expose les 3 via des onglets.

type Tab = "observations" | "rules" | "qa";

interface Observation {
  id: string;
  society_id: string;
  product: string;
  observation_type: string;
  payload: Record<string, unknown>;
  severity: string | null;
  source: string | null;
  observed_at: string;
}

interface BusinessRule {
  id: string;
  society_id: string | null;
  product: string | null;
  rule_text: string;
  rule_payload: Record<string, unknown> | null;
  active: boolean;
  approved_at: string | null;
  created_at: string;
}

interface ValidatedQa {
  id: string;
  question: string;
  answer: string;
  product: string | null;
  society_id: string | null;
  validation_count: number;
  last_used_at: string | null;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warn: "bg-amber-500/20 text-amber-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function Proph3tMemoryPage() {
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("observations");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [qa, setQa] = useState<ValidatedQa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });
  const [detailRule, setDetailRule] = useState<BusinessRule | null>(null);
  const [detailQa, setDetailQa] = useState<ValidatedQa | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [obsRes, rulesRes, qaRes] = await Promise.all([
      supabase.from("proph3t_observations").select("*").order("observed_at", { ascending: false }).limit(500),
      supabase.from("proph3t_business_rules").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("proph3t_validated_qa").select("*").order("validation_count", { ascending: false }).limit(500),
    ]);
    setObservations((obsRes.data as Observation[]) || []);
    setRules((rulesRes.data as BusinessRule[]) || []);
    setQa((qaRes.data as ValidatedQa[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const approveRule = async (rule: BusinessRule) => {
    const { error } = await supabase.from("proph3t_business_rules").update({
      active: true, approved_at: new Date().toISOString(),
    }).eq("id", rule.id);
    if (error) showError(formatSupabaseError(error));
    else { success("Règle activée"); fetchAll(); }
  };

  const deactivateRule = async (rule: BusinessRule) => {
    const { error } = await supabase.from("proph3t_business_rules").update({ active: false }).eq("id", rule.id);
    if (error) showError(formatSupabaseError(error));
    else { success("Règle désactivée"); fetchAll(); }
  };

  const deleteEntry = (table: string, id: string, label: string) => {
    setConfirmDialog({
      open: true, title: "Supprimer l'entrée ?", message: `${label} sera supprimée de la mémoire PROPH3T.`,
      onConfirm: async () => {
        const { error } = await supabase.from(table).delete().eq("id", id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (error) showError(formatSupabaseError(error));
        else { success("Supprimée"); fetchAll(); }
      },
    });
  };

  const filteredObservations = observations.filter(o => !search || JSON.stringify(o.payload).toLowerCase().includes(search.toLowerCase()) || (o.observation_type || "").includes(search.toLowerCase()));
  const filteredRules = rules.filter(r => !search || r.rule_text.toLowerCase().includes(search.toLowerCase()));
  const filteredQa = qa.filter(q => !search || q.question.toLowerCase().includes(search.toLowerCase()) || q.answer.toLowerCase().includes(search.toLowerCase()));

  const tabs: { id: Tab; label: string; icon: typeof Database; count: number }[] = [
    { id: "observations", label: "Observations", icon: Database, count: observations.length },
    { id: "rules", label: "Règles métier", icon: ListChecks, count: rules.length },
    { id: "qa", label: "Q/R validées", icon: BookMarked, count: qa.length },
  ];

  return (
    <div>
      <AdminPageHeader title="Mémoire PROPH3T" subtitle="Observations, règles métier auto-générées et Q/R validées par les utilisateurs">
        <AdminButton icon={RefreshCw} variant="secondary" onClick={fetchAll}>Rafraîchir</AdminButton>
      </AdminPageHeader>

      <AdminFilterPills
        filters={tabs.map(t => ({ label: `${t.label}`, value: t.id, count: t.count }))}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      <div className="mb-6 mt-4">
        <AdminSearch value={search} onChange={setSearch} placeholder={`Rechercher dans ${tabs.find(t => t.id === tab)?.label.toLowerCase() || "…"}`} />
      </div>

      {tab === "observations" && (
        <AdminTable
          keyExtractor={(r: Observation) => r.id}
          loading={loading}
          emptyMessage="Aucune observation enregistrée"
          emptyIcon={<Database size={32} />}
          columns={[
            { key: "observation_type", label: "Type", render: (r: Observation) => (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-400">{r.observation_type}</span>
            )},
            { key: "severity", label: "Sévérité", render: (r: Observation) => r.severity ? (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEVERITY_COLORS[r.severity] || ""}`}>{r.severity}</span>
            ) : "—" },
            { key: "product", label: "Produit" },
            { key: "society_id", label: "Société", render: (r: Observation) => <span className="font-mono text-[11px]">{r.society_id?.slice(0, 8) || "—"}</span> },
            { key: "payload", label: "Détail", render: (r: Observation) => (
              <span className="text-neutral-muted dark:text-admin-muted text-[12px] truncate max-w-[260px] block">{JSON.stringify(r.payload).slice(0, 80)}</span>
            )},
            { key: "observed_at", label: "Observée", sortable: true, render: (r: Observation) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.observed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
            )},
            { key: "actions", label: "", render: (r: Observation) => (
              <button onClick={(e) => { e.stopPropagation(); deleteEntry("proph3t_observations", r.id, "Cette observation"); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            )},
          ]}
          data={filteredObservations}
        />
      )}

      {tab === "rules" && (
        <AdminTable
          keyExtractor={(r: BusinessRule) => r.id}
          loading={loading}
          emptyMessage="Aucune règle métier"
          emptyIcon={<ListChecks size={32} />}
          onRowClick={setDetailRule}
          columns={[
            { key: "active", label: "Statut", render: (r: BusinessRule) => (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.active ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-500/20 text-neutral-400"}`}>{r.active ? "Active" : "En attente"}</span>
            )},
            { key: "rule_text", label: "Règle", render: (r: BusinessRule) => (
              <div className="text-neutral-text dark:text-admin-text text-[13px] truncate max-w-[400px]">{r.rule_text}</div>
            )},
            { key: "scope", label: "Portée", render: (r: BusinessRule) => (
              <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">
                {r.product || "*"} / {r.society_id ? r.society_id.slice(0, 8) : "*"}
              </span>
            )},
            { key: "created_at", label: "Créée", sortable: true, render: (r: BusinessRule) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
            )},
            { key: "actions", label: "", render: (r: BusinessRule) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {!r.active && <button onClick={() => approveRule(r)} className="px-2 py-1 rounded text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">Activer</button>}
                {r.active && <button onClick={() => deactivateRule(r)} className="px-2 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">Désactiver</button>}
                <button onClick={() => deleteEntry("proph3t_business_rules", r.id, "Cette règle")} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            )},
          ]}
          data={filteredRules}
        />
      )}

      {tab === "qa" && (
        <AdminTable
          keyExtractor={(r: ValidatedQa) => r.id}
          loading={loading}
          emptyMessage="Aucune Q/R validée"
          emptyIcon={<BookMarked size={32} />}
          onRowClick={setDetailQa}
          columns={[
            { key: "question", label: "Question", render: (r: ValidatedQa) => (
              <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium truncate max-w-[400px]">{r.question}</div>
            )},
            { key: "validation_count", label: "👍", render: (r: ValidatedQa) => (
              <span className="font-mono text-[13px]">{r.validation_count}</span>
            )},
            { key: "product", label: "Produit", render: (r: ValidatedQa) => r.product || "—" },
            { key: "last_used_at", label: "Dernière utilisation", sortable: true, render: (r: ValidatedQa) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{r.last_used_at ? new Date(r.last_used_at).toLocaleDateString("fr-FR") : "Jamais"}</span>
            )},
            { key: "actions", label: "", render: (r: ValidatedQa) => (
              <button onClick={(e) => { e.stopPropagation(); deleteEntry("proph3t_validated_qa", r.id, "Cette paire Q/R"); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            )},
          ]}
          data={filteredQa}
        />
      )}

      <AdminModal open={!!detailRule} onClose={() => setDetailRule(null)} title="Détail règle métier" size="md">
        {detailRule && (
          <div className="space-y-4">
            <div className="text-neutral-text dark:text-admin-text text-sm whitespace-pre-wrap bg-warm-bg dark:bg-admin-surface-alt p-4 rounded-lg">{detailRule.rule_text}</div>
            {detailRule.rule_payload && (
              <pre className="text-[11px] bg-warm-bg dark:bg-admin-surface-alt p-3 rounded font-mono overflow-x-auto">{JSON.stringify(detailRule.rule_payload, null, 2)}</pre>
            )}
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div><span className="text-neutral-muted dark:text-admin-muted">Société:</span> <span className="font-mono">{detailRule.society_id || "globale"}</span></div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Produit:</span> {detailRule.product || "transverse"}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Créée:</span> {new Date(detailRule.created_at).toLocaleDateString("fr-FR")}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Validée:</span> {detailRule.approved_at ? new Date(detailRule.approved_at).toLocaleDateString("fr-FR") : "En attente"}</div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal open={!!detailQa} onClose={() => setDetailQa(null)} title="Détail Q/R validée" size="lg">
        {detailQa && (
          <div className="space-y-4">
            <div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Question</div>
              <div className="text-neutral-text dark:text-admin-text text-sm bg-warm-bg dark:bg-admin-surface-alt p-3 rounded-lg whitespace-pre-wrap">{detailQa.question}</div>
            </div>
            <div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Réponse validée</div>
              <div className="text-neutral-text dark:text-admin-text text-sm bg-warm-bg dark:bg-admin-surface-alt p-3 rounded-lg whitespace-pre-wrap">{detailQa.answer}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-[12px]">
              <div><span className="text-neutral-muted dark:text-admin-muted">👍:</span> <span className="font-mono">{detailQa.validation_count}</span></div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Produit:</span> {detailQa.product || "—"}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Dernière utilisation:</span> {detailQa.last_used_at ? new Date(detailQa.last_used_at).toLocaleDateString("fr-FR") : "Jamais"}</div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />

      {/* Prevent unused import warnings during incremental migration */}
      <span className="hidden"><Brain size={1} /></span>
    </div>
  );
}
