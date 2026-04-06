import type { TextBlock } from '../../../types/newsletter'

export function BlockText({ block }: { block: TextBlock }) {
  const { content, fontSize, color, align, padding } = block.props
  return (
    <div style={{ padding, textAlign: align }}>
      <div style={{ fontSize, color, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{content || 'Votre texte ici...'}</div>
    </div>
  )
}
