import { useMemo, useState } from 'react';
import { FileText, Save, Loader2, Copy, Check } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { AdminModal } from '../../components/AdminModal';
import { useSharedTemplates, timeAgoFr } from './hooks';
import type { SharedTemplateRow } from './types';

// Catégorisation depuis la convention de nommage `template_<agent>_<purpose>`
type TemplateGroup = {
  key: string;
  label: string;
  matcher: (key: string) => boolean;
};

const GROUPS: TemplateGroup[] = [
  {
    key: 'cs',
    label: 'Customer Success',
    matcher: (k) => k.startsWith('template_cs_'),
  },
  {
    key: 'sdr',
    label: 'SDR (outreach)',
    matcher: (k) => k.startsWith('template_sdr_'),
  },
  {
    key: 'content',
    label: 'Content (posts)',
    matcher: (k) => k.startsWith('template_content_'),
  },
  {
    key: 'facturation',
    label: 'Facturation',
    matcher: (k) => k.startsWith('template_facturation_'),
  },
  {
    key: 'support_n1',
    label: 'Support N1',
    matcher: (k) => k.startsWith('template_support_'),
  },
  {
    key: 'dev',
    label: 'Dev (PR)',
    matcher: (k) => k.startsWith('template_dev_'),
  },
  {
    key: 'qa',
    label: 'QA (rapports)',
    matcher: (k) => k.startsWith('template_qa_'),
  },
  {
    key: 'closer',
    label: 'Closer (propositions)',
    matcher: (k) => k.startsWith('template_closer_'),
  },
  {
    key: 'incident',
    label: 'Incidents (communications)',
    matcher: (k) => k.startsWith('template_incident_'),
  },
];

export default function AsvcTemplatesPage() {
  const { rows, loading, error, updateTemplate, saving } = useSharedTemplates();
  const [editing, setEditing] = useState<SharedTemplateRow | null>(null);

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: rows.filter((r) => g.matcher(r.key)),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  const stats = useMemo(() => {
    const annexeF = rows.filter((r) => r.value.source_annexe === 'F').length;
    const annexeG = rows.filter((r) => r.value.source_annexe === 'G').length;
    return { total: rows.length, annexeF, annexeG };
  }, [rows]);

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Templates ASVC"
        subtitle={`${stats.total} templates — ${stats.annexeF} Annexe F + ${stats.annexeG} Annexe G`}
      />

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[12px]">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-neutral-500 text-sm py-10 text-center">
          Chargement des templates...
        </p>
      )}

      <div className="space-y-6">
        {grouped.map((g) => (
          <section key={g.key}>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
              {g.label}
              <span className="ml-2 text-neutral-700">{g.items.length}</span>
            </h2>
            <div className="grid gap-2.5 md:grid-cols-2">
              {g.items.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onEdit={() => setEditing(tpl)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <TemplateEditorModal
          template={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={async (newValue) => {
            await updateTemplate(editing.id, newValue);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Carte template (preview)
// ───────────────────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onEdit,
}: {
  template: SharedTemplateRow;
  onEdit: () => void;
}) {
  const preview = template.value.body.slice(0, 140);
  const truncated = template.value.body.length > 140;
  const version = template.value.version ?? 1;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="text-left rounded-xl border border-white/10 bg-onyx-light/30 hover:bg-onyx-light/50 hover:border-admin-accent/30 p-4 transition group"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-admin-accent/15 text-admin-accent flex items-center justify-center flex-shrink-0">
          <FileText size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-neutral-light text-[13px] font-medium truncate">
            {template.description ?? template.key}
          </h3>
          <p className="text-neutral-600 text-[10px] font-mono truncate">{template.key}</p>
        </div>
        <span className="text-[10px] text-neutral-500 flex-shrink-0">v{version}</span>
      </div>

      {template.value.subject && (
        <p className="text-neutral-400 text-[11px] mb-1.5 truncate">
          <span className="text-neutral-500">Objet :</span> {template.value.subject}
        </p>
      )}

      <p className="text-neutral-500 text-[11px] leading-snug whitespace-pre-line line-clamp-3">
        {preview}
        {truncated && '…'}
      </p>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-600">
        <span>{template.value.body.length} chars</span>
        {template.value.variables && template.value.variables.length > 0 && (
          <>
            <span>·</span>
            <span>{template.value.variables.length} variables</span>
          </>
        )}
        <span>·</span>
        <span>maj {timeAgoFr(template.updated_at)}</span>
      </div>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Modal édition
// ───────────────────────────────────────────────────────────────────────────
function TemplateEditorModal({
  template,
  saving,
  onClose,
  onSave,
}: {
  template: SharedTemplateRow;
  saving: boolean;
  onClose: () => void;
  onSave: (newValue: SharedTemplateRow['value']) => Promise<void>;
}) {
  const [subject, setSubject] = useState(template.value.subject ?? '');
  const [body, setBody] = useState(template.value.body);
  const [copied, setCopied] = useState(false);
  const dirty = subject !== (template.value.subject ?? '') || body !== template.value.body;
  const variables = template.value.variables ?? [];

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={template.description ?? template.key}
      subtitle={template.key}
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 text-[12px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...template.value, subject, body })}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-accent text-onyx font-semibold disabled:opacity-40 disabled:cursor-not-allowed text-[12px]"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Enregistrer (v{(template.value.version ?? 1) + 1})
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {variables.length > 0 && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
              Variables disponibles
            </label>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <span
                  key={v}
                  className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10.5px] font-mono text-neutral-300"
                >
                  [{v}]
                </span>
              ))}
            </div>
          </div>
        )}

        {(template.value.subject !== undefined || subject) && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
              Objet (email)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-onyx-light/30 text-neutral-200 text-[13px] focus:border-admin-accent focus:outline-none"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500">
              Corps du template
            </label>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-onyx-light/30 text-neutral-200 text-[12.5px] font-mono leading-relaxed focus:border-admin-accent focus:outline-none resize-y"
          />
          <p className="mt-1 text-[10px] text-neutral-600">{body.length} caractères</p>
        </div>

        {template.value.platform && (
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <Meta label="Plateforme" value={template.value.platform} />
            <Meta label="Type" value={template.value.type ?? '—'} />
          </div>
        )}

        {template.value.hashtags && template.value.hashtags.length > 0 && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
              Hashtags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {template.value.hashtags.map((h) => (
                <span
                  key={h}
                  className="px-1.5 py-0.5 rounded border border-admin-accent/20 bg-admin-accent/5 text-[10.5px] text-admin-accent"
                >
                  #{h}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-neutral-600 pt-2 border-t border-white/5 flex items-center justify-between">
          <span>Source : Annexe {template.value.source_annexe ?? '?'}</span>
          <span>Dernière maj : {timeAgoFr(template.updated_at)}</span>
        </div>
      </div>
    </AdminModal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-widest text-neutral-500 mb-0.5">{label}</p>
      <p className="text-neutral-300 text-[12px]">{value}</p>
    </div>
  );
}
