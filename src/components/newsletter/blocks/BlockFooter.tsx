import type { FooterBlock } from '../../../types/newsletter'

export function BlockFooter({ block }: { block: FooterBlock }) {
  const { companyName, address, unsubscribeText, color } = block.props
  return (
    <div style={{ padding: '24px 32px', textAlign: 'center', borderTop: '0.5px solid #EEE' }}>
      <div style={{ fontSize: 11, color }}>{companyName} · {address}</div>
      <div style={{ marginTop: 8 }}>
        <span style={{ fontSize: 11, color: '#EF9F27', cursor: 'pointer' }}>{unsubscribeText}</span>
        <span style={{ fontSize: 11, color }}> · </span>
        <span style={{ fontSize: 11, color: '#EF9F27', cursor: 'pointer' }}>Voir en ligne</span>
      </div>
    </div>
  )
}
