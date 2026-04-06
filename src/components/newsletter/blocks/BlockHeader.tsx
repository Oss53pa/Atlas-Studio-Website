import type { HeaderBlock } from '../../../types/newsletter'

export function BlockHeader({ block }: { block: HeaderBlock }) {
  const { title, subtitle, bg, titleColor, subtitleColor } = block.props
  return (
    <div style={{ padding: '28px 32px', textAlign: 'center', background: bg }}>
      <div style={{ fontSize: 26, fontWeight: 500, color: titleColor, lineHeight: 1.3 }}>{title || 'Titre'}</div>
      {subtitle && <div style={{ fontSize: 14, color: subtitleColor || '#888', marginTop: 8 }}>{subtitle}</div>}
    </div>
  )
}
