import { useState } from 'react'
import { LayoutTemplate, Type, Image, MousePointerClick, Minus, Columns2, Star, PanelBottom, Settings, Users, Blocks } from 'lucide-react'
import type { Campaign, BlockType } from '../../types/newsletter'
import { BLOCK_LABELS } from '../../lib/newsletter/blockDefaults'
import { SegmentSelector } from './SegmentSelector'

const ICONS: Record<string, React.ElementType> = { LayoutTemplate, Type, Image, MousePointerClick, Minus, Columns2, Star, PanelBottom }
const BLOCK_TYPES: BlockType[] = ['header', 'text', 'image', 'button', 'divider', 'cols2', 'featured', 'footer']

interface Props {
  campaign: Campaign
  accentColor: string
  onAddBlock: (type: BlockType) => void
  onUpdateMeta: (meta: Partial<Campaign>) => void
  onAccentColorChange: (color: string) => void
}

export function EditorSidebar({ campaign, accentColor, onAddBlock, onUpdateMeta, onAccentColorChange }: Props) {
  const [tab, setTab] = useState<'blocks' | 'settings' | 'segment'>('blocks')

  return (
    <div className="w-64 bg-[#1E1E2E] border-r border-[#2A2A3A] flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#2A2A3A]">
        {([
          { key: 'blocks', icon: Blocks, label: 'Blocs' },
          { key: 'settings', icon: Settings, label: 'Réglages' },
          { key: 'segment', icon: Users, label: 'Segment' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs transition-colors ${tab === key ? 'text-[#EF9F27] border-b-2 border-[#EF9F27]' : 'text-[#888] hover:text-[#F5F5F5]'}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'blocks' && (
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map(type => {
              const meta = BLOCK_LABELS[type]
              const Icon = ICONS[meta.icon] || Blocks
              return (
                <button key={type} onClick={() => onAddBlock(type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#2A2A3A]/50 hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors text-xs"
                >
                  <Icon size={18} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <Field label="Objet" value={campaign.subject} onChange={v => onUpdateMeta({ subject: v })} />
            <Field label="Objet B (A/B)" value={campaign.subject_variant_b || ''} onChange={v => onUpdateMeta({ subject_variant_b: v })} />
            <Field label="Preview text" value={campaign.preview_text || ''} onChange={v => onUpdateMeta({ preview_text: v })} />
            <Field label="Nom expéditeur" value={campaign.from_name} onChange={v => onUpdateMeta({ from_name: v })} />
            <Field label="Email expéditeur" value={campaign.from_email} onChange={v => onUpdateMeta({ from_email: v })} />
            <Field label="Reply-to" value={campaign.reply_to || ''} onChange={v => onUpdateMeta({ reply_to: v })} />
            <div>
              <label className="text-[11px] text-[#888] mb-1 block">Couleur accent</label>
              <input type="color" value={accentColor} onChange={e => onAccentColorChange(e.target.value)} className="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={campaign.ab_test_enabled} onChange={e => onUpdateMeta({ ab_test_enabled: e.target.checked })} className="accent-[#EF9F27]" />
              <span className="text-xs text-[#F5F5F5]">Test A/B</span>
            </div>
            {campaign.ab_test_enabled && (
              <div>
                <label className="text-[11px] text-[#888] mb-1 block">Split ratio (% variante A)</label>
                <input type="range" min={10} max={90} value={campaign.ab_split_ratio} onChange={e => onUpdateMeta({ ab_split_ratio: parseInt(e.target.value) })} className="w-full accent-[#EF9F27]" />
                <div className="text-[11px] text-[#888] text-center">{campaign.ab_split_ratio}% A / {100 - campaign.ab_split_ratio}% B</div>
              </div>
            )}
          </div>
        )}

        {tab === 'segment' && (
          <SegmentSelector
            selectedIds={campaign.segment_ids || []}
            onChange={ids => onUpdateMeta({ segment_ids: ids })}
          />
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-[#2A2A3A] border border-[#2A2A3A] rounded text-xs text-[#F5F5F5] focus:border-[#EF9F27] outline-none"
      />
    </div>
  )
}
