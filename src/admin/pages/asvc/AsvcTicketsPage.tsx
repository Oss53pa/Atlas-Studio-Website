import { useState } from 'react';
import { MessageSquare, Sparkles, Loader2, AlertCircle, ArrowLeft, Bug } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { AdminTable } from '../../components/AdminTable';
import { useTickets, useTicketDetail, timeAgoFr } from './hooks';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_CLASSES,
  TICKET_STATUS_LABELS,
  type Ticket,
} from './types';

export default function AsvcTicketsPage() {
  const { tickets, loading, refresh } = useTickets();
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div>
      <AdminPageHeader
        title="Tickets SAV"
        subtitle="Conversations clients — le Support N1 Agent peut proposer des drafts de réponse"
      />

      {activeId ? (
        <TicketDetail ticketId={activeId} onBack={() => { setActiveId(null); refresh(); }} />
      ) : (
        <TicketsList
          tickets={tickets}
          loading={loading}
          onSelect={(t) => setActiveId(t.id)}
        />
      )}
    </div>
  );
}

function TicketsList({
  tickets,
  loading,
  onSelect,
}: {
  tickets: Ticket[];
  loading: boolean;
  onSelect: (t: Ticket) => void;
}) {
  const columns = [
    {
      key: 'ticket_number',
      label: 'N°',
      sortable: true,
      className: 'font-mono text-[11px] whitespace-nowrap',
      render: (t: Ticket) => <span className="text-admin-muted">{t.ticket_number}</span>,
    },
    {
      key: 'subject',
      label: 'Client / Sujet',
      sortable: true,
      render: (t: Ticket) => (
        <div>
          <div className="text-admin-text truncate max-w-md">
            {t.subject ?? <span className="italic text-admin-muted">(sans objet)</span>}
          </div>
          <div className="text-admin-muted text-[11px]">
            {t.client_name ?? t.client_email ?? 'anonyme'}
          </div>
        </div>
      ),
    },
    {
      key: 'app_concerned',
      label: 'App',
      sortable: true,
      render: (t: Ticket) => (
        <span className="text-admin-muted text-[11px]">{t.app_concerned ?? '—'}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priorité',
      sortable: true,
      render: (t: Ticket) => (
        <span
          className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${TICKET_PRIORITY_CLASSES[t.priority]}`}
        >
          {TICKET_PRIORITY_LABELS[t.priority]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (t: Ticket) => (
        <span className="text-admin-muted text-[11px]">{TICKET_STATUS_LABELS[t.status]}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Reçu',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (t: Ticket) => <span className="text-admin-muted text-[11px]">{timeAgoFr(t.created_at)}</span>,
    },
  ];

  return (
    <AdminTable
      columns={columns}
      data={tickets}
      keyExtractor={(t) => t.id}
      loading={loading}
      onRowClick={onSelect}
      pageSize={25}
      stickyHeader
      emptyMessage="Aucun ticket pour le moment. Les tickets arrivent via les connecteurs (Gmail, WhatsApp, in-app) une fois configurés."
      emptyIcon={<MessageSquare size={32} strokeWidth={1.5} />}
    />
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { ticket, messages, loading, drafting, draftError, requestDraft, requestBugTriage } =
    useTicketDetail(ticketId);

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;
  if (!ticket) {
    return (
      <div className="text-neutral-500 text-sm">
        Ticket introuvable.{' '}
        <button onClick={onBack} className="text-admin-accent hover:underline">
          Retour
        </button>
      </div>
    );
  }

  const isBug = ticket.category === 'bug';

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 text-[12px] mb-4 transition"
      >
        <ArrowLeft size={13} />
        Retour à la liste
      </button>

      <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-neutral-500 text-[11px] font-mono">{ticket.ticket_number}</div>
            <h2 className="text-neutral-light text-base font-semibold mt-0.5">
              {ticket.subject ?? <span className="italic text-neutral-500">(sans objet)</span>}
            </h2>
            <div className="text-neutral-400 text-[12px] mt-1">
              {ticket.client_name ?? ticket.client_email ?? 'anonyme'}
              {ticket.app_concerned && <> · {ticket.app_concerned}</>}
              <> · via {ticket.source}</>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${TICKET_PRIORITY_CLASSES[ticket.priority]}`}>
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </span>
            <span className="text-neutral-500 text-[10px]">
              {TICKET_STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <Bubble
            sender="client"
            label={ticket.client_name ?? 'Client'}
            content={ticket.initial_message}
            time={ticket.created_at}
          />
          {messages.map((m) => (
            <Bubble
              key={m.id}
              sender={m.sender_type}
              label={m.sender_type === 'agent' ? 'Atlas Studio' : m.sender_type === 'ceo' ? 'CEO' : ticket.client_name ?? 'Client'}
              content={m.content}
              time={m.created_at}
            />
          ))}
        </div>

        {draftError && (
          <p className="mb-2 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-1.5">
            <AlertCircle size={12} />
            {draftError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => requestDraft()}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-2 rounded-lg transition"
          >
            {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {drafting ? 'Agent en cours...' : 'Demander un draft au Support N1'}
          </button>

          <button
            type="button"
            onClick={() => requestBugTriage()}
            disabled={drafting}
            className={`inline-flex items-center gap-1.5 border text-[12px] px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isBug
                ? 'bg-white/5 border-white/15 text-neutral-200 hover:bg-white/10'
                : 'border-white/10 text-neutral-400 hover:bg-white/5'
            }`}
            title={isBug ? 'Catégorie = bug : triage recommandé' : 'Forcer le triage bug même si la catégorie n\'est pas \"bug\"'}
          >
            <Bug size={13} />
            Trier comme bug
          </button>
        </div>
        <p className="text-neutral-600 text-[11px] mt-2">
          Le résultat de l'agent apparaîtra dans l'inbox d'arbitrages — rien n'est envoyé sans ta validation.
        </p>
      </div>
    </div>
  );
}

function Bubble({
  sender,
  label,
  content,
  time,
}: {
  sender: 'client' | 'agent' | 'ceo';
  label: string;
  content: string;
  time: string;
}) {
  const isClient = sender === 'client';
  return (
    <div className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
          isClient
            ? 'bg-white/5 border border-white/10 text-neutral-200'
            : sender === 'ceo'
              ? 'bg-admin-accent/20 border border-admin-accent/30 text-neutral-100'
              : 'bg-white/8 border border-white/10 text-neutral-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-1 text-[10px] text-neutral-500">
          <span className="font-medium">{label}</span>
          <span>·</span>
          <span>{timeAgoFr(time)}</span>
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
