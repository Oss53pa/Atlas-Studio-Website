import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { EmailBlock } from '../../types/newsletter'
import { BlockHeader } from './blocks/BlockHeader'
import { BlockText } from './blocks/BlockText'
import { BlockImage } from './blocks/BlockImage'
import { BlockButton } from './blocks/BlockButton'
import { BlockDivider } from './blocks/BlockDivider'
import { BlockCols2 } from './blocks/BlockCols2'
import { BlockFeatured } from './blocks/BlockFeatured'
import { BlockFooter } from './blocks/BlockFooter'

interface Props {
  blocks: EmailBlock[]
  selectedBlockId: string | null
  viewMode: string
  onSelectBlock: (id: string) => void
  onRemoveBlock: (id: string) => void
  onUpdateBlock: (id: string, props: Record<string, unknown>) => void
}

function SortableBlock({ block, isSelected, onSelect, onRemove }: {
  block: EmailBlock; isSelected: boolean; onSelect: () => void; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} onClick={(e) => { e.stopPropagation(); onSelect() }}
      className={`relative group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[#EF9F27] ring-offset-1' : 'hover:ring-1 hover:ring-[#EF9F27]/30'}`}
    >
      {/* Controls overlay */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <button {...attributes} {...listeners} className="p-1 rounded bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] cursor-grab"><GripVertical size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1 rounded bg-[#2A2A3A] text-[#888] hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      {/* Block render */}
      <div className="bg-white rounded overflow-hidden">
        {renderBlockComponent(block)}
      </div>
    </div>
  )
}

function renderBlockComponent(block: EmailBlock) {
  switch (block.type) {
    case 'header': return <BlockHeader block={block} />
    case 'text': return <BlockText block={block} />
    case 'image': return <BlockImage block={block} />
    case 'button': return <BlockButton block={block} />
    case 'divider': return <BlockDivider block={block} />
    case 'cols2': return <BlockCols2 block={block} />
    case 'featured': return <BlockFeatured block={block} />
    case 'footer': return <BlockFooter block={block} />
    default: return null
  }
}

export function EditorCanvas({ blocks, selectedBlockId, onSelectBlock, onRemoveBlock }: Props) {
  return (
    <div className="space-y-1 pl-12" onClick={() => onSelectBlock('')}>
      {blocks.length === 0 ? (
        <div className="text-center py-20 text-[#888] text-sm">
          Ajoutez des blocs depuis le panneau gauche
        </div>
      ) : (
        blocks.map(block => (
          <SortableBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            onRemove={() => onRemoveBlock(block.id)}
          />
        ))
      )}
    </div>
  )
}
