import { Check, CreditCard, Landmark, Smartphone } from 'lucide-react'
import type { PaymentMethodInfo, SavedPaymentMethod } from '../../types/payment'

interface Props {
  methods: PaymentMethodInfo[]
  selected: string
  onChange: (id: string) => void
  savedMethods?: SavedPaymentMethod[]
}

const methodIcon = (id: string) => {
  if (id.startsWith('card')) return <CreditCard size={20} />
  if (id === 'wire_transfer') return <Landmark size={20} />
  return <Smartphone size={20} />
}

export default function MethodSelector({ methods, selected, onChange, savedMethods }: Props) {
  const savedFor = (methodId: string) =>
    savedMethods?.filter((s) => s.type === methodId) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
        Choisissez un moyen de paiement
      </p>

      {methods.map((m) => {
        const isSelected = selected === m.id
        const saved = savedFor(m.id)

        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              background: '#FFFFFF',
              border: `2px solid ${isSelected ? '#EF9F27' : '#E8E8E0'}`,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              textAlign: 'left',
            }}
          >
            {/* Radio dot */}
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${isSelected ? '#EF9F27' : '#E8E8E0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isSelected && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#EF9F27',
                  }}
                />
              )}
            </span>

            {/* Operator logo color block */}
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: m.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {methodIcon(m.id)}
            </span>

            {/* Text */}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                {m.label}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: '#888', marginTop: 2 }}>
                {m.description}
              </span>
              {saved.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#EF9F27', marginTop: 4 }}>
                  <Check size={12} />
                  {saved[0].phone_number ?? saved[0].card_last4 ?? 'Enregistr\u00e9'}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
