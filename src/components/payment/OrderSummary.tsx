import { Receipt } from 'lucide-react'

interface Props {
  description: string
  amount: number
  invoiceNumber?: string
}

const TVA_RATE = 0.18

export default function OrderSummary({ description, amount, invoiceNumber }: Props) {
  const subtotal = Math.round(amount / (1 + TVA_RATE))
  const tva = amount - subtotal

  const fmt = (v: number) =>
    v.toLocaleString('fr-FR', { style: 'decimal', maximumFractionDigits: 0 })

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E0',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Receipt size={18} color="#EF9F27" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
          R&eacute;capitulatif
        </span>
      </div>

      {/* Invoice number */}
      {invoiceNumber && (
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
          Facture : <span style={{ fontFamily: 'monospace' }}>{invoiceNumber}</span>
        </p>
      )}

      {/* Description */}
      <p style={{ fontSize: 14, color: '#1A1A1A', margin: 0 }}>{description}</p>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E0', margin: 0 }} />

      {/* Line items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        <Row label="Sous-total HT" value={`${fmt(subtotal)} FCFA`} />
        <Row label={`TVA (${(TVA_RATE * 100).toFixed(0)}%)`} value={`${fmt(tva)} FCFA`} />
      </div>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E0', margin: 0 }} />

      {/* Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Total TTC</span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: '#EF9F27',
          }}
        >
          {fmt(amount)}&nbsp;FCFA
        </span>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: '#1A1A1A' }}>{value}</span>
    </div>
  )
}
