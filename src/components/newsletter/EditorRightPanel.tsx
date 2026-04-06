import type { EmailBlock } from '../../types/newsletter'

interface Props {
  block: EmailBlock | null
  accentColor: string
  onUpdate: (props: Record<string, unknown>) => void
}

export function EditorRightPanel({ block, accentColor, onUpdate }: Props) {
  if (!block) return (
    <div className="w-72 bg-[#1E1E2E] border-l border-[#2A2A3A] flex items-center justify-center">
      <p className="text-[#888] text-xs text-center px-6">Sélectionnez un bloc pour modifier ses propriétés</p>
    </div>
  )

  return (
    <div className="w-72 bg-[#1E1E2E] border-l border-[#2A2A3A] overflow-y-auto">
      <div className="p-4 border-b border-[#2A2A3A]">
        <h3 className="text-xs font-medium text-[#F5F5F5] uppercase tracking-wider">Propriétés</h3>
      </div>
      <div className="p-4 space-y-4">
        {block.type === 'header' && (<>
          <PropField label="Titre" value={block.props.title} onChange={v => onUpdate({ title: v })} />
          <PropField label="Sous-titre" value={block.props.subtitle} onChange={v => onUpdate({ subtitle: v })} />
          <ColorField label="Fond" value={block.props.bg} onChange={v => onUpdate({ bg: v })} />
          <ColorField label="Couleur titre" value={block.props.titleColor} onChange={v => onUpdate({ titleColor: v })} />
          <ColorField label="Couleur sous-titre" value={block.props.subtitleColor || '#888888'} onChange={v => onUpdate({ subtitleColor: v })} />
        </>)}
        {block.type === 'text' && (<>
          <PropTextarea label="Contenu" value={block.props.content} onChange={v => onUpdate({ content: v })} />
          <PropNumber label="Taille police" value={block.props.fontSize} onChange={v => onUpdate({ fontSize: v })} min={10} max={32} />
          <ColorField label="Couleur" value={block.props.color} onChange={v => onUpdate({ color: v })} />
          <AlignField value={block.props.align} onChange={v => onUpdate({ align: v })} />
        </>)}
        {block.type === 'image' && (<>
          <PropField label="URL image" value={block.props.src} onChange={v => onUpdate({ src: v })} />
          <PropField label="Texte alt" value={block.props.alt} onChange={v => onUpdate({ alt: v })} />
          <PropField label="Largeur" value={block.props.width} onChange={v => onUpdate({ width: v })} />
          <PropField label="Lien (URL)" value={block.props.linkUrl || ''} onChange={v => onUpdate({ linkUrl: v })} />
          <PropNumber label="Arrondi" value={block.props.borderRadius} onChange={v => onUpdate({ borderRadius: v })} min={0} max={50} />
          <AlignField value={block.props.align} onChange={v => onUpdate({ align: v })} />
        </>)}
        {block.type === 'button' && (<>
          <PropField label="Texte" value={block.props.text} onChange={v => onUpdate({ text: v })} />
          <PropField label="URL" value={block.props.url} onChange={v => onUpdate({ url: v })} />
          <ColorField label="Couleur fond" value={block.props.color} onChange={v => onUpdate({ color: v })} />
          <ColorField label="Couleur texte" value={block.props.textColor} onChange={v => onUpdate({ textColor: v })} />
          <PropNumber label="Arrondi" value={block.props.borderRadius} onChange={v => onUpdate({ borderRadius: v })} min={0} max={50} />
          <AlignField value={block.props.align} onChange={v => onUpdate({ align: v })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={block.props.fullWidth} onChange={e => onUpdate({ fullWidth: e.target.checked })} className="accent-[#EF9F27]" />
            <span className="text-xs text-[#F5F5F5]">Pleine largeur</span>
          </div>
        </>)}
        {block.type === 'divider' && (<>
          <ColorField label="Couleur" value={block.props.color} onChange={v => onUpdate({ color: v })} />
          <PropNumber label="Épaisseur" value={block.props.thickness} onChange={v => onUpdate({ thickness: v })} min={1} max={10} />
          <SelectField label="Style" value={block.props.style} options={['solid','dashed','dotted']} onChange={v => onUpdate({ style: v })} />
        </>)}
        {block.type === 'cols2' && (<>
          <div className="text-[11px] text-[#EF9F27] font-medium mb-1">Colonne gauche</div>
          <PropField label="Titre" value={block.props.left.title} onChange={v => onUpdate({ left: { ...block.props.left, title: v } })} />
          <PropField label="Texte" value={block.props.left.text} onChange={v => onUpdate({ left: { ...block.props.left, text: v } })} />
          <PropField label="Emoji" value={block.props.left.iconEmoji || ''} onChange={v => onUpdate({ left: { ...block.props.left, iconEmoji: v } })} />
          <div className="text-[11px] text-[#EF9F27] font-medium mb-1 mt-3">Colonne droite</div>
          <PropField label="Titre" value={block.props.right.title} onChange={v => onUpdate({ right: { ...block.props.right, title: v } })} />
          <PropField label="Texte" value={block.props.right.text} onChange={v => onUpdate({ right: { ...block.props.right, text: v } })} />
          <PropField label="Emoji" value={block.props.right.iconEmoji || ''} onChange={v => onUpdate({ right: { ...block.props.right, iconEmoji: v } })} />
          <ColorField label="Fond colonnes" value={block.props.bg} onChange={v => onUpdate({ bg: v })} />
        </>)}
        {block.type === 'featured' && (<>
          <PropField label="Badge" value={block.props.badge} onChange={v => onUpdate({ badge: v })} />
          <PropField label="Titre" value={block.props.title} onChange={v => onUpdate({ title: v })} />
          <PropField label="Sous-titre" value={block.props.subtitle} onChange={v => onUpdate({ subtitle: v })} />
          <PropField label="Texte CTA" value={block.props.ctaText} onChange={v => onUpdate({ ctaText: v })} />
          <PropField label="URL CTA" value={block.props.ctaUrl} onChange={v => onUpdate({ ctaUrl: v })} />
          <ColorField label="Fond" value={block.props.bg} onChange={v => onUpdate({ bg: v })} />
          <ColorField label="Accent" value={block.props.accentColor} onChange={v => onUpdate({ accentColor: v })} />
        </>)}
        {block.type === 'footer' && (<>
          <PropField label="Entreprise" value={block.props.companyName} onChange={v => onUpdate({ companyName: v })} />
          <PropField label="Adresse" value={block.props.address} onChange={v => onUpdate({ address: v })} />
          <PropField label="Texte désabonnement" value={block.props.unsubscribeText} onChange={v => onUpdate({ unsubscribeText: v })} />
          <ColorField label="Couleur texte" value={block.props.color} onChange={v => onUpdate({ color: v })} />
        </>)}
      </div>
    </div>
  )
}

function PropField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#2A2A3A] border border-[#2A2A3A] rounded text-xs text-[#F5F5F5] focus:border-[#EF9F27] outline-none" />
    </div>
  )
}

function PropTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={5} className="w-full px-2.5 py-1.5 bg-[#2A2A3A] border border-[#2A2A3A] rounded text-xs text-[#F5F5F5] focus:border-[#EF9F27] outline-none resize-none" />
    </div>
  )
}

function PropNumber({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} min={min} max={max} className="w-full px-2.5 py-1.5 bg-[#2A2A3A] border border-[#2A2A3A] rounded text-xs text-[#F5F5F5] focus:border-[#EF9F27] outline-none" />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
      <div className="flex-1">
        <label className="text-[11px] text-[#888] block">{label}</label>
        <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-1.5 py-0.5 bg-[#2A2A3A] rounded text-[10px] text-[#F5F5F5] font-mono outline-none" />
      </div>
    </div>
  )
}

function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">Alignement</label>
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map(a => (
          <button key={a} onClick={() => onChange(a)}
            className={`flex-1 py-1 text-xs rounded ${value === a ? 'bg-[#EF9F27] text-black' : 'bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5]'}`}
          >
            {a === 'left' ? 'Gauche' : a === 'center' ? 'Centre' : 'Droite'}
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] text-[#888] mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#2A2A3A] border border-[#2A2A3A] rounded text-xs text-[#F5F5F5] outline-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
