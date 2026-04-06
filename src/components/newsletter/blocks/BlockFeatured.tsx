import type { FeaturedBlock } from '../../../types/newsletter'

export function BlockFeatured({ block }: { block: FeaturedBlock }) {
  const { badge, title, subtitle, ctaText, bg, accentColor } = block.props
  return (
    <div style={{ padding: '16px 32px' }}>
      <div style={{ background: bg, borderRadius: 10, padding: 28, textAlign: 'center' }}>
        {badge && <div style={{ fontSize: 11, color: accentColor, fontWeight: 500, letterSpacing: 1, marginBottom: 10 }}>{badge}</div>}
        <div style={{ fontSize: 22, fontWeight: 500, color: '#FFF', marginBottom: 8 }}>{title || 'Titre produit'}</div>
        <div style={{ fontSize: 13, color: '#AAA', marginBottom: 20 }}>{subtitle}</div>
        <span style={{ display: 'inline-block', padding: '10px 28px', background: accentColor, color: '#000', fontSize: 13, fontWeight: 500, borderRadius: 6 }}>{ctaText}</span>
      </div>
    </div>
  )
}
