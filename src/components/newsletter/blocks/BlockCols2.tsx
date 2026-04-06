import type { Cols2Block } from '../../../types/newsletter'

export function BlockCols2({ block }: { block: Cols2Block }) {
  const { left, right, bg, gap } = block.props
  const renderCol = (col: { title: string; text: string; iconEmoji?: string }) => (
    <div style={{ flex: 1, background: bg, borderRadius: 8, padding: 16 }}>
      {col.iconEmoji && <div style={{ fontSize: 20, marginBottom: 8 }}>{col.iconEmoji}</div>}
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', marginBottom: 6 }}>{col.title}</div>
      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{col.text}</div>
    </div>
  )
  return (
    <div style={{ padding: '16px 24px', display: 'flex', gap }}>
      {renderCol(left)}
      {renderCol(right)}
    </div>
  )
}
