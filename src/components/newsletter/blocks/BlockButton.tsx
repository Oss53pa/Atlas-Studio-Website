import type { ButtonBlock } from '../../../types/newsletter'

export function BlockButton({ block }: { block: ButtonBlock }) {
  const { text, color, textColor, align, borderRadius, padding, fullWidth } = block.props
  return (
    <div style={{ padding: '16px 32px', textAlign: align }}>
      <span style={{
        display: 'inline-block', padding, background: color, color: textColor,
        fontSize: 14, fontWeight: 500, borderRadius, cursor: 'pointer',
        ...(fullWidth ? { width: '100%', textAlign: 'center', boxSizing: 'border-box' as const } : {})
      }}>{text || 'Bouton'}</span>
    </div>
  )
}
