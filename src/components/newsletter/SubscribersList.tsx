import { useState, useRef } from 'react'
import { useSubscribers } from '../../hooks/newsletter/useSubscribers'
import { Search, Plus, Upload, Download, Trash2, Loader2, Users, UserCheck, UserMinus, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ImportModal } from './ImportModal'

export function SubscribersList() {
  const { subscribers, loading, stats, fetchSubscribers, addSubscriber, deleteSubscriber, updateSubscriberStatus } = useSubscribers()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')

  const filtered = subscribers.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search && !s.email.toLowerCase().includes(search.toLowerCase()) && !(s.full_name || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = async () => {
    if (!newEmail) return
    await addSubscriber(newEmail, newName || undefined)
    setNewEmail(''); setNewName(''); setShowAdd(false)
  }

  const handleExport = () => {
    const csv = ['email,name,status,source,created_at', ...filtered.map(s => `${s.email},${s.full_name || ''},${s.status},${s.source},${s.created_at}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'subscribers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    { label: 'Total', value: stats.total, icon: Users, color: '#EF9F27' },
    { label: 'Actifs', value: stats.active, icon: UserCheck, color: '#22C55E' },
    { label: 'Désabonnés', value: stats.unsubscribed, icon: UserMinus, color: '#F59E0B' },
    { label: 'Rebonds', value: stats.bounced, icon: UserX, color: '#EF4444' },
  ]

  return (
    <div className="p-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><k.icon size={14} style={{ color: k.color }} /><span className="text-[11px] text-[#888]">{k.label}</span></div>
            <div className="text-xl font-bold text-[#F5F5F5]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input value={search} onChange={e => { setSearch(e.target.value); fetchSubscribers(e.target.value, statusFilter) }}
            placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 bg-[#1E1E2E] border border-[#2A2A3A] rounded-lg text-sm text-[#F5F5F5] outline-none focus:border-[#EF9F27]" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchSubscribers(search, e.target.value) }}
          className="px-3 py-2 bg-[#1E1E2E] border border-[#2A2A3A] rounded-lg text-sm text-[#F5F5F5] outline-none">
          <option value="all">Tous</option><option value="active">Actifs</option><option value="unsubscribed">Désabonnés</option><option value="bounced">Rebonds</option>
        </select>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#EF9F27] text-black rounded-lg text-sm font-medium hover:bg-[#C47E00]"><Plus size={14} />Ajouter</button>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 border border-[#2A2A3A] text-[#F5F5F5] rounded-lg text-sm hover:bg-[#2A2A3A]"><Upload size={14} />Importer CSV</button>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-[#2A2A3A] text-[#F5F5F5] rounded-lg text-sm hover:bg-[#2A2A3A]"><Download size={14} />Exporter</button>
      </div>

      {/* Add form inline */}
      {showAdd && (
        <div className="mb-4 p-4 bg-[#1E1E2E] border border-[#EF9F27]/30 rounded-xl flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-[#888] mb-1 block">Email</label>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-1.5 bg-[#2A2A3A] rounded text-sm text-[#F5F5F5] outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-[#888] mb-1 block">Nom (optionnel)</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom complet" className="w-full px-3 py-1.5 bg-[#2A2A3A] rounded text-sm text-[#F5F5F5] outline-none" />
          </div>
          <button onClick={handleAdd} className="px-4 py-1.5 bg-[#EF9F27] text-black rounded text-sm font-medium">Ajouter</button>
          <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-[#888] text-sm">Annuler</button>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-[#EF9F27]" /></div> : (
        <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#2A2A3A]">
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Nom</th>
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Statut</th>
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Source</th>
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Opens</th>
              <th className="text-left px-4 py-3 text-[11px] text-[#888] font-medium">Clics</th>
              <th className="text-right px-4 py-3 text-[11px] text-[#888] font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-[#2A2A3A]/50 hover:bg-[#2A2A3A]/20">
                  <td className="px-4 py-2.5 text-xs text-[#F5F5F5]">{s.email}</td>
                  <td className="px-4 py-2.5 text-xs text-[#888]">{s.full_name || '-'}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === 'active' ? 'text-green-400 bg-green-400/10' : s.status === 'unsubscribed' ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'}`}>{s.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-[#888]">{s.source}</td>
                  <td className="px-4 py-2.5 text-xs text-[#888]">{s.open_count}</td>
                  <td className="px-4 py-2.5 text-xs text-[#888]">{s.click_count}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => deleteSubscriber(s.id)} className="p-1 rounded hover:bg-red-500/10 text-[#888] hover:text-red-400"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => fetchSubscribers()} />}
    </div>
  )
}
