import { Sunrise, RefreshCw, Loader2 } from 'lucide-react';
import type { CooBrief } from '../types';
import { timeAgoFr } from '../hooks';

interface Props {
  brief: CooBrief | null;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}

interface SectionKpi {
  emoji: string;
  label: string;
  rows: Array<{ label: string; value: string | number; accent?: 'red' | 'amber' | 'emerald' }>;
}

function fcfa(n: unknown): string {
  if (typeof n !== 'number') return String(n ?? '—');
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function num(n: unknown): string {
  if (typeof n !== 'number') return String(n ?? '0');
  return new Intl.NumberFormat('fr-FR').format(n);
}

/** Construit les sections HIER (Production, R&D, Commercial, SAV, Finance) à partir du KPIs payload de la RPC. */
function buildSections(kpis: Record<string, unknown> | null | undefined): SectionKpi[] {
  if (!kpis) return [];

  const k = kpis as {
    actions_window?: { proposed?: number; approved?: number; rejected?: number; executed?: number };
    arbitrations?: { pending?: number; urgent?: number; high?: number };
    tickets?: {
      open?: number; in_progress?: number; resolved_window?: number; urgent_open?: number; avg_resolution_minutes_window?: number;
    };
    leads?: { total_active?: number; new_window?: number; qualified_window?: number; won_window?: number; pipeline_fcfa?: number };
    invoices?: { issued_window?: number; paid_window_fcfa?: number; overdue_count?: number; overdue_fcfa?: number };
    content?: { published_window?: number; pending_approval?: number; engagements_window?: number };
    agents?: { total?: number; active?: number; kill_switches_active?: number };
  };

  const sections: SectionKpi[] = [];

  sections.push({
    emoji: '🛠️',
    label: 'Production / Système',
    rows: [
      { label: 'Actions proposées', value: num(k.actions_window?.proposed) },
      { label: 'Approuvées', value: num(k.actions_window?.approved), accent: 'emerald' },
      { label: 'Rejetées', value: num(k.actions_window?.rejected), accent: 'red' },
      { label: 'Exécutées', value: num(k.actions_window?.executed), accent: 'amber' },
      { label: 'Agents actifs', value: `${k.agents?.active ?? 0}/${k.agents?.total ?? 0}` },
    ],
  });

  sections.push({
    emoji: '🎫',
    label: 'SAV',
    rows: [
      { label: 'Tickets ouverts', value: num(k.tickets?.open) },
      { label: 'En cours', value: num(k.tickets?.in_progress) },
      { label: 'Urgents', value: num(k.tickets?.urgent_open), accent: (k.tickets?.urgent_open ?? 0) > 0 ? 'red' : undefined },
      { label: 'Résolus période', value: num(k.tickets?.resolved_window), accent: 'emerald' },
      { label: 'Temps moy. résolution', value: `${num(k.tickets?.avg_resolution_minutes_window)} min` },
    ],
  });

  sections.push({
    emoji: '💼',
    label: 'Commercial',
    rows: [
      { label: 'Leads actifs', value: num(k.leads?.total_active) },
      { label: 'Nouveaux', value: num(k.leads?.new_window) },
      { label: 'Qualifiés', value: num(k.leads?.qualified_window) },
      { label: 'Gagnés', value: num(k.leads?.won_window), accent: 'emerald' },
      { label: 'Pipeline', value: fcfa(k.leads?.pipeline_fcfa), accent: 'amber' },
    ],
  });

  sections.push({
    emoji: '💰',
    label: 'Finance',
    rows: [
      { label: 'Factures émises', value: num(k.invoices?.issued_window) },
      { label: 'Encaissé', value: fcfa(k.invoices?.paid_window_fcfa), accent: 'emerald' },
      {
        label: 'En retard',
        value: `${num(k.invoices?.overdue_count)} (${fcfa(k.invoices?.overdue_fcfa)})`,
        accent: (k.invoices?.overdue_count ?? 0) > 0 ? 'red' : undefined,
      },
    ],
  });

  sections.push({
    emoji: '📣',
    label: 'Marketing',
    rows: [
      { label: 'Posts publiés', value: num(k.content?.published_window) },
      { label: 'Engagements', value: num(k.content?.engagements_window) },
      { label: 'En attente validation', value: num(k.content?.pending_approval), accent: (k.content?.pending_approval ?? 0) > 0 ? 'amber' : undefined },
    ],
  });

  return sections;
}

export function BriefMatinalCard({ brief, generating, error, onGenerate }: Props) {
  const dateFmt = brief
    ? new Date(brief.brief_date).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null;

  const sections = buildSections((brief?.kpis as Record<string, unknown> | null) ?? null);

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-onyx-light/50 to-onyx-light/20 p-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Sunrise size={16} className="text-admin-accent" />
          <h2 className="text-neutral-light text-sm font-semibold">Brief matinal</h2>
          <span className="text-neutral-500 text-[11px] truncate">
            {dateFmt
              ? `${dateFmt} · généré ${timeAgoFr(brief!.created_at)}`
              : 'En attente du premier brief'}
          </span>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 text-[11px] rounded-md transition"
        >
          {generating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {generating ? 'Génération...' : 'Générer maintenant'}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
          Erreur génération brief : {error}
        </p>
      )}

      {brief ? (
        <>
          {/* Summary texte généré par Claude */}
          <p className="text-neutral-300 text-[13.5px] leading-relaxed whitespace-pre-line mb-4">
            {brief.summary}
          </p>

          {/* Sections KPIs structurées sous le summary */}
          {sections.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 border-t border-white/5">
              {sections.map((s) => (
                <KpiSection key={s.label} section={s} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-neutral-500 text-[13px] italic">
          Aucun brief publié pour le moment. Clique sur "Générer maintenant" pour
          produire le premier brief, ou attends le cron de 7h00 quand le COO sera planifié.
        </p>
      )}
    </section>
  );
}

function KpiSection({ section }: { section: SectionKpi }) {
  return (
    <div className="rounded-lg border border-white/5 bg-onyx-light/30 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
        <span>{section.emoji}</span>
        {section.label}
      </div>
      <div className="space-y-0.5">
        {section.rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2 text-[11.5px]">
            <span className="text-neutral-500 truncate">{r.label}</span>
            <span
              className={`font-mono whitespace-nowrap ${
                r.accent === 'red'
                  ? 'text-red-300'
                  : r.accent === 'emerald'
                    ? 'text-emerald-300'
                    : r.accent === 'amber'
                      ? 'text-admin-accent'
                      : 'text-neutral-300'
              }`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
