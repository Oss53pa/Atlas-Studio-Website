import { useState } from 'react'
import { Copy, Check, Landmark, AlertTriangle } from 'lucide-react'

interface Props {
  reference: string
  amount: number
}

const BANK = {
  name: 'Atlas Studio SAS',
  bank: 'Ecobank C\u00f4te d\u2019Ivoire',
  iban: 'CI93 CI04 0012 0003 0000 1234 5678',
  swift: 'EABORACI',
}

export default function WireTransferInstructions({ reference, amount }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

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
        <Landmark size={18} color="#EF9F27" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
          Instructions de virement
        </span>
      </div>

      {/* Bank details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        <Field label="B\u00e9n\u00e9ficiaire" value={BANK.name} onCopy={copy} copied={copied} />
        <Field label="Banque" value={BANK.bank} onCopy={copy} copied={copied} />
        <Field label="IBAN" value={BANK.iban} onCopy={copy} copied={copied} />
        <Field label="SWIFT/BIC" value={BANK.swift} onCopy={copy} copied={copied} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E0', margin: 0 }} />

      {/* Reference */}
      <div>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>
          R\u00e9f\u00e9rence obligatoire
        </p>
        <button
          onClick={() => copy('R\u00e9f\u00e9rence', reference)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 14px',
            background: '#FAFAF7',
            border: '1px dashed #EF9F27',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 15,
            fontWeight: 600,
            color: '#1A1A1A',
          }}
        >
          {reference}
          {copied === 'R\u00e9f\u00e9rence' ? <Check size={14} color="#22C55E" /> : <Copy size={14} color="#888" />}
        </button>
      </div>

      {/* Amount */}
      <p style={{ fontSize: 13, color: '#1A1A1A', margin: 0 }}>
        Montant exact : <strong style={{ fontFamily: 'monospace' }}>{fmt(amount)} FCFA</strong>
      </p>

      {/* Warning */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          background: '#FFF8ED',
          borderRadius: 8,
          fontSize: 12,
          color: '#92610A',
          lineHeight: 1.5,
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Indiquez la r&eacute;f&eacute;rence dans le motif du virement. Sans cette r&eacute;f&eacute;rence, votre paiement ne pourra pas &ecirc;tre identifi&eacute; automatiquement. D&eacute;lai de confirmation : 2-3 jours ouvr&eacute;s.
        </span>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string
  value: string
  onCopy: (label: string, value: string) => void
  copied: string | null
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1A1A1A' }}>
        {value}
        <button
          onClick={() => onCopy(label, value)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
        >
          {copied === label ? <Check size={13} color="#22C55E" /> : <Copy size={13} color="#888" />}
        </button>
      </span>
    </div>
  )
}
