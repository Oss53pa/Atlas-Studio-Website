import type { ImageBlock } from '../../../types/newsletter'

export function BlockImage({ block }: { block: ImageBlock }) {
  const { src, alt, width, align, borderRadius } = block.props
  if (!src) return (
    <div style={{ padding: '16px 32px', textAlign: align }}>
      <div style={{ background: '#F9F9F9', border: '2px dashed #CCC', borderRadius: 8, padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
        Cliquer pour ajouter une image
      </div>
    </div>
  )
  return (
    <div style={{ padding: '16px 32px', textAlign: align }}>
      <img src={src} alt={alt} style={{ width, borderRadius, maxWidth: '100%' }} />
    </div>
  )
}
