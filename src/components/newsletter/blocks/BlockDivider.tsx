import type { DividerBlock } from '../../../types/newsletter'

export function BlockDivider({ block }: { block: DividerBlock }) {
  const { color, thickness, style, margin } = block.props
  return (
    <div style={{ margin }}>
      <div style={{ height: thickness, background: color, borderStyle: style }} />
    </div>
  )
}
