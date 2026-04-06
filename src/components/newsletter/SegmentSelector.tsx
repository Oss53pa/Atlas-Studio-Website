import { useSegments } from '../../hooks/newsletter/useSegments'
import { Users, Loader2 } from 'lucide-react'

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function SegmentSelector({ selectedIds, onChange }: Props) {
  const { segments, loading } = useSegments()

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id])
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#EF9F27]" /></div>

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#888]">Sélectionnez les segments cibles</p>
      {segments.map(seg => (
        <button key={seg.id} onClick={() => toggle(seg.id)}
          className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedIds.includes(seg.id) ? 'border-[#EF9F27] bg-[#EF9F27]/10' : 'border-[#2A2A3A] bg-[#2A2A3A]/30 hover:bg-[#2A2A3A]'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={13} className={selectedIds.includes(seg.id) ? 'text-[#EF9F27]' : 'text-[#888]'} />
            <span className="text-xs text-[#F5F5F5] font-medium">{seg.name}</span>
          </div>
          {seg.description && <p className="text-[10px] text-[#888] mt-1 ml-5">{seg.description}</p>}
          <div className="text-[10px] text-[#888] mt-1 ml-5">{seg.subscriber_count} abonnés</div>
        </button>
      ))}
    </div>
  )
}
