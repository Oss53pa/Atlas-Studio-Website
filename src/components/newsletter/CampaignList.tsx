import { useState } from 'react'
import { useCampaigns } from '../../hooks/newsletter/useCampaigns'
import { Plus, Pencil, BarChart3, Copy, Trash2, Loader2, Mail, Clock, Send, PauseCircle, XCircle } from 'lucide-react'

interface Props {
  onEdit: (id: string) => void
  onStats: (id: string) => void
  onCreate: () => void
}

const STATUS_CONF: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: '#888', icon: Pencil },
  scheduled: { label: 'Programmée', color: '#3B82F6', icon: Clock },
  sending: { label: 'En envoi', color: '#EF9F27', icon: Send },
  sent: { label: 'Envoyée', color: '#22C55E', icon: Mail },
  paused: { label: 'Pausée', color: '#F59E0B', icon: PauseCircle },
  cancelled: { label: 'Annulée', color: '#EF4444', icon: XCircle },
}

export function CampaignList({ onEdit, onStats, onCreate }: Props) {
  const { campaigns, loading, deleteCampaign, duplicateCampaign } = useCampaigns()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    setDeleting(id)
    await deleteCampaign(id)
    setDeleting(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">Campagnes Newsletter</h1>
          <p className="text-sm text-[#888] mt-1">{campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-[#EF9F27] text-black rounded-lg text-sm font-medium hover:bg-[#C47E00] transition-colors">
          <Plus size={16} />Nouvelle campagne
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-[#EF9F27]" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={48} className="mx-auto text-[#888] mb-4" strokeWidth={1} />
          <p className="text-[#888] text-sm">Aucune campagne. Créez votre première newsletter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => {
            const conf = STATUS_CONF[c.status] || STATUS_CONF.draft
            const Icon = conf.icon
            const openRate = c.delivered_count > 0 ? ((c.unique_open_count / c.delivered_count) * 100).toFixed(1) : '-'
            const clickRate = c.delivered_count > 0 ? ((c.unique_click_count / c.delivered_count) * 100).toFixed(1) : '-'
            return (
              <div key={c.id} className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-4 hover:border-[#EF9F27]/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[#F5F5F5] truncate">{c.name}</h3>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: conf.color, background: conf.color + '15' }}>
                        <Icon size={10} />{conf.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#888] mt-0.5 truncate">{c.subject || 'Sans objet'}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-[#888]">
                      <span>{c.recipient_count} destinataires</span>
                      <span>Ouvertures: {openRate}%</span>
                      <span>Clics: {clickRate}%</span>
                      <span>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(c.id)} className="p-2 rounded-lg hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors" title="Modifier"><Pencil size={14} /></button>
                    {c.status === 'sent' && <button onClick={() => onStats(c.id)} className="p-2 rounded-lg hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors" title="Statistiques"><BarChart3 size={14} /></button>}
                    <button onClick={() => duplicateCampaign(c)} className="p-2 rounded-lg hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors" title="Dupliquer"><Copy size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="p-2 rounded-lg hover:bg-red-500/10 text-[#888] hover:text-red-400 transition-colors" title="Supprimer">
                      {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
