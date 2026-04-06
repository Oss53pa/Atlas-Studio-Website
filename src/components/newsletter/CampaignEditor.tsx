import { useState, useCallback } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { EditorSidebar } from './EditorSidebar'
import { EditorCanvas } from './EditorCanvas'
import { EditorRightPanel } from './EditorRightPanel'
import { useCampaignEditor } from '../../hooks/newsletter/useCampaignEditor'
import { createDefaultBlock } from '../../lib/newsletter/blockDefaults'
import type { BlockType } from '../../types/newsletter'
import { Eye, Smartphone, Monitor, Send, TestTube2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { apiCall } from '../../lib/api'

type ViewMode = 'editor' | 'preview-desktop' | 'preview-mobile'

interface Props {
  campaignId: string
  onBack: () => void
}

export function CampaignEditor({ campaignId, onBack }: Props) {
  const {
    campaign, blocks, selectedBlockId,
    updateBlock, addBlock, removeBlock, reorderBlocks,
    selectBlock, updateCampaignMeta, saveCampaign, isSaving
  } = useCampaignEditor(campaignId)

  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [accentColor, setAccentColor] = useState('#EF9F27')

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id)
      const newIndex = blocks.findIndex(b => b.id === over.id)
      reorderBlocks(arrayMove(blocks, oldIndex, newIndex))
    }
  }, [blocks, reorderBlocks])

  const handleAddBlock = useCallback((type: BlockType) => {
    const newBlock = createDefaultBlock(type, accentColor)
    addBlock(newBlock)
    selectBlock(newBlock.id)
  }, [accentColor, addBlock, selectBlock])

  const handleSendTest = async () => {
    const email = prompt('Envoyer un test à quelle adresse ?')
    if (!email) return
    try {
      await apiCall('newsletter-send', { method: 'POST', body: { campaign_id: campaignId, test_email: email } })
      alert('Email test envoyé !')
    } catch { alert('Erreur lors de l\'envoi test') }
  }

  if (!campaign) return (
    <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
      <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
    </div>
  )

  return (
    <div className="flex h-full bg-[#0A0A0A] overflow-hidden">
      <EditorSidebar campaign={campaign} accentColor={accentColor} onAddBlock={handleAddBlock} onUpdateMeta={updateCampaignMeta} onAccentColorChange={setAccentColor} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1E1E2E] border-b border-[#2A2A3A]">
          <button onClick={onBack} className="p-1.5 rounded hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors"><ArrowLeft size={16} /></button>
          <input className="text-sm font-medium bg-transparent text-[#F5F5F5] outline-none w-48" value={campaign.name} onChange={e => updateCampaignMeta({ name: e.target.value })} placeholder="Nom de la campagne" />

          <div className="flex gap-1 ml-auto">
            {([
              { mode: 'editor' as const, icon: Monitor, label: 'Éditeur' },
              { mode: 'preview-desktop' as const, icon: Eye, label: 'Aperçu' },
              { mode: 'preview-mobile' as const, icon: Smartphone, label: 'Mobile' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${viewMode === mode ? 'bg-[#EF9F27] text-black font-medium' : 'text-[#888] hover:text-[#F5F5F5] hover:bg-[#2A2A3A]'}`}
              >
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-4">
            <button onClick={handleSendTest} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#2A2A3A] text-[#F5F5F5] rounded-md hover:bg-[#2A2A3A] transition-colors"><TestTube2 size={13} />Tester</button>
            <button onClick={saveCampaign} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#2A2A3A] text-[#F5F5F5] rounded-md hover:bg-[#2A2A3A] transition-colors">
              <Save size={13} />{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#EF9F27] text-black rounded-md font-medium hover:bg-[#C47E00] transition-colors"><Send size={13} />Envoyer</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-[#0A0A0A]">
          <div className={`transition-all duration-300 ${viewMode === 'preview-mobile' ? 'w-[375px]' : 'w-[580px]'}`}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <EditorCanvas blocks={blocks} selectedBlockId={selectedBlockId} viewMode={viewMode} onSelectBlock={selectBlock} onRemoveBlock={removeBlock} onUpdateBlock={updateBlock} />
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      <EditorRightPanel block={blocks.find(b => b.id === selectedBlockId) || null} accentColor={accentColor} onUpdate={(props) => selectedBlockId && updateBlock(selectedBlockId, props)} />
    </div>
  )
}
