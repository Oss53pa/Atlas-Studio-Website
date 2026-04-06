import { useState, useMemo } from 'react'
import { Phone, Loader2 } from 'lucide-react'
import { detectOperator } from '../../lib/payment/phoneDetector'
import { PAYMENT_METHODS } from '../../types/payment'

interface Props {
  operator: string
  onSubmit: (phone: string, save: boolean) => void
  loading: boolean
}

const INSTRUCTIONS: Record<string, string> = {
  orange_money: 'Vous recevrez une demande de confirmation sur votre t\u00e9l\u00e9phone. Tapez votre code secret pour valider.',
  mtn_momo: 'Composez *133# pour confirmer la transaction depuis votre t\u00e9l\u00e9phone.',
  wave: 'Ouvrez l\u2019application Wave pour approuver le paiement.',
  moov_money: 'Vous recevrez un SMS de confirmation. R\u00e9pondez OUI pour valider.',
}

export default function MobileMoneyForm({ operator, onSubmit, loading }: Props) {
  const [phone, setPhone] = useState('')
  const [save, setSave] = useState(false)

  const detection = useMemo(() => detectOperator(phone), [phone])
  const detectedInfo = PAYMENT_METHODS.find((m) => m.id === detection.operator)
  const instruction = INSTRUCTIONS[operator] ?? INSTRUCTIONS[detection.operator] ?? ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!detection.valid || loading) return
    onSubmit(detection.formatted, save)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Phone input */}
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
        Num\u00e9ro de t\u00e9l\u00e9phone
      </label>
      <div style={{ position: 'relative' }}>
        <Phone size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#888' }} />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07 XX XX XX XX"
          style={{
            width: '100%',
            padding: '12px 12px 12px 36px',
            fontSize: 15,
            border: `1px solid ${detection.valid ? '#EF9F27' : '#E8E8E0'}`,
            borderRadius: 8,
            background: '#FFFFFF',
            color: '#1A1A1A',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {/* Detected operator badge */}
        {detection.valid && detectedInfo && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: 10,
              background: detectedInfo.color,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 20,
            }}
          >
            {detectedInfo.label}
          </span>
        )}
      </div>

      {/* Instruction text */}
      {instruction && (
        <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.5 }}>
          {instruction}
        </p>
      )}

      {/* Save checkbox */}
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={save}
          onChange={(e) => setSave(e.target.checked)}
          style={{ accentColor: '#EF9F27', width: 16, height: 16 }}
        />
        Enregistrer ce num\u00e9ro pour mes prochains paiements
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={!detection.valid || loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '13px 0',
          background: detection.valid ? '#EF9F27' : '#E8E8E0',
          color: detection.valid ? '#fff' : '#888',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: detection.valid && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Envoi en cours\u2026' : 'Payer maintenant'}
      </button>
    </form>
  )
}
