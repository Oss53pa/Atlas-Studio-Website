import { useMemo, useState } from 'react';
import { Plus, Loader2, Calendar, AlertCircle, Hash, X as XIcon } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { usePaged, PaginationBar } from '../../components/PaginationBar';
import { CardListSkeleton } from '../../components/AsvcSkeletons';
import { useContentCalendar, timeAgoFr } from './hooks';
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_CLASSES,
  type ContentChannel,
  type ContentStatus,
} from './types';

type ChannelFilter = 'all' | ContentChannel;

const CHANNEL_FILTERS: { id: ChannelFilter; label: string }[] = [
  { id: 'all', label: 'Tous canaux' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'blog', label: 'Blog' },
];

export default function AsvcContentPage() {
  const { entries, loading, generating, genError, draftNew } = useContentCalendar();
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.channel === filter)),
    [entries, filter],
  );

  const stats = useMemo(() => {
    const s = { drafts: 0, scheduled: 0, published: 0 };
    for (const e of entries) {
      if (e.status === 'pending_approval' || e.status === 'draft') s.drafts++;
      else if (e.status === 'scheduled') s.scheduled++;
      else if (e.status === 'published') s.published++;
    }
    return s;
  }, [entries]);

  const { pageItems, page, setPage, totalPages, total, pageSize } = usePaged(filtered, 20);

  return (
    <div>
      <AdminPageHeader
        title="Content Calendar"
        subtitle="Posts sociaux, newsletter et articles — draftés par l'agent Content"
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={13} />
          Nouveau post
        </button>
      </AdminPageHeader>

      <div className="flex flex-wrap gap-3 mb-5 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-admin-accent/30 bg-admin-accent/10 text-admin-accent">
          <span className="font-semibold">{stats.drafts}</span>
          <span className="opacity-80">à valider</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-300">
          <span className="font-semibold">{stats.scheduled}</span>
          <span className="opacity-80">programmés</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <span className="font-semibold">{stats.published}</span>
          <span className="opacity-80">publiés</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {CHANNEL_FILTERS.map((f) => {
          const active = filter === f.id;
          const count = f.id === 'all' ? entries.length : entries.filter((e) => e.channel === f.id).length;
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

      {loading && <CardListSkeleton />}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
          <Calendar size={20} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">Aucun contenu pour ce filtre.</p>
          <p className="text-neutral-600 text-[11px] mt-1">
            Clique sur "Nouveau post" pour que l'agent Content draft son premier post.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pageItems.map((entry) => (
          <ContentCard key={entry.id} entry={entry} />
        ))}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      {modalOpen && (
        <NewPostModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (channel, topic, scheduledAt, context) => {
            try {
              await draftNew(channel, topic, scheduledAt, context);
              setModalOpen(false);
            } catch {
              // genError affiché in-modal
            }
          }}
          generating={generating}
          genError={genError}
        />
      )}
    </div>
  );
}

function ContentCard({ entry }: { entry: { id: string; channel: ContentChannel; content: string; title: string | null; status: ContentStatus; created_at: string; scheduled_at: string | null; hashtags: string[] | null; impressions: number; engagements: number } }) {
  const [expanded, setExpanded] = useState(false);
  const preview = entry.content.slice(0, 180);
  const truncated = entry.content.length > 180;
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mb-0.5">
            <span className="font-semibold text-neutral-400">
              {CONTENT_CHANNEL_LABELS[entry.channel]}
            </span>
            <span>·</span>
            <span>drafté {timeAgoFr(entry.created_at)}</span>
            {entry.scheduled_at && (
              <>
                <span>·</span>
                <span className="text-blue-300">
                  programmé pour {new Date(entry.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </>
            )}
          </div>
          {entry.title && (
            <h3 className="text-neutral-light text-[13px] font-medium truncate">{entry.title}</h3>
          )}
        </div>
        <span
          className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${CONTENT_STATUS_CLASSES[entry.status]}`}
        >
          {CONTENT_STATUS_LABELS[entry.status]}
        </span>
      </div>

      <div className="text-neutral-300 text-[12.5px] leading-relaxed whitespace-pre-wrap bg-black/30 border border-white/5 rounded-lg p-3">
        {expanded ? entry.content : preview}
        {truncated && !expanded && '...'}
        {truncated && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="block mt-2 text-admin-accent hover:underline text-[11px]"
          >
            {expanded ? 'Réduire' : 'Voir tout'}
          </button>
        )}
      </div>

      {entry.hashtags && entry.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.hashtags.map((h) => (
            <span key={h} className="inline-flex items-center gap-0.5 text-[10.5px] text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">
              <Hash size={9} />
              {h.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}

      {(entry.impressions > 0 || entry.engagements > 0) && (
        <div className="mt-2 flex gap-3 text-[10.5px] text-neutral-500">
          <span>{entry.impressions.toLocaleString('fr-FR')} impressions</span>
          <span>{entry.engagements.toLocaleString('fr-FR')} engagements</span>
        </div>
      )}
    </div>
  );
}

function NewPostModal({
  onClose,
  onSubmit,
  generating,
  genError,
}: {
  onClose: () => void;
  onSubmit: (channel: ContentChannel, topic: string, scheduledAt?: string, context?: string) => Promise<void>;
  generating: boolean;
  genError: string | null;
}) {
  const [channel, setChannel] = useState<ContentChannel>('linkedin');
  const [topic, setTopic] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [context, setContext] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 5) return;
    onSubmit(channel, topic.trim(), scheduledAt || undefined, context.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-onyx border border-white/10 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-neutral-light text-sm font-semibold">Nouveau post — demande à l'agent Content</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <XIcon size={16} />
          </button>
        </div>

        <label className="block mb-3">
          <span className="text-neutral-400 text-[11px] mb-1 block">Canal</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ContentChannel)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light outline-none focus:border-admin-accent/50"
          >
            {Object.entries(CONTENT_CHANNEL_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-onyx">
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-3">
          <span className="text-neutral-400 text-[11px] mb-1 block">Sujet / angle</span>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ex: Nouvelle TVA UEMOA 2026 — impact pour les PME ; ou : retour d'expérience client cabinet compta..."
            rows={3}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light placeholder:text-neutral-600 outline-none focus:border-admin-accent/50"
            required
          />
        </label>

        <label className="block mb-3">
          <span className="text-neutral-400 text-[11px] mb-1 block">Programmation (optionnel)</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light outline-none focus:border-admin-accent/50"
          />
        </label>

        <label className="block mb-4">
          <span className="text-neutral-400 text-[11px] mb-1 block">Contexte complémentaire (optionnel)</span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="ex: faire référence à l'étude Banque Mondiale 2025 ; tonalité plus directe..."
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light placeholder:text-neutral-600 outline-none focus:border-admin-accent/50"
          />
        </label>

        {genError && (
          <p className="mb-3 text-red-300 text-[11.5px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-1.5">
            <AlertCircle size={11} />
            {genError}
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
            disabled={generating || topic.trim().length < 5}
            className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-2 rounded-lg transition"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {generating ? 'Agent en cours...' : 'Drafter'}
          </button>
        </div>
      </form>
    </div>
  );
}
