import { useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { usePaymentStatus } from '../../hooks/usePaymentSession'

interface Props {
  transactionId: string
  onRetry: () => void
  onSuccess: () => void
}

const confettiKeyframes = `
@keyframes confetti-fall {
  0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
}
`

function Confetti() {
  const dots = Array.from({ length: 18 }, (_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 1.2
    const colors = ['#EF9F27', '#22C55E', '#3B82F6', '#F97316', '#8B5CF6']
    const color = colors[i % colors.length]
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${left}%`,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          animation: `confetti-fall 1.6s ease-out ${delay}s both`,
        }}
      />
    )
  })
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{dots}</div>
}

export default function PaymentStatus({ transactionId, onRetry, onSuccess }: Props) {
  const { transaction, loading } = usePaymentStatus(transactionId)
  const status = transaction?.status ?? (loading ? 'pending' : 'pending')

  useEffect(() => {
    if (status === 'success') onSuccess()
  }, [status, onSuccess])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '40px 24px',
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E8E8E0',
        textAlign: 'center',
      }}
    >
      <style>{confettiKeyframes}</style>

      {/* Pending / Processing */}
      {(status === 'pending' || status === 'processing') && (
        <>
          <Loader2 size={48} color="#EF9F27" className="animate-spin" />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
            Paiement en cours de traitement
          </p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Veuillez confirmer la transaction sur votre t&eacute;l&eacute;phone&hellip;
          </p>
        </>
      )}

      {/* Success */}
      {status === 'success' && (
        <>
          <Confetti />
          <CheckCircle2 size={48} color="#22C55E" />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
            Paiement confirm&eacute; !
          </p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Transaction {transactionId.slice(0, 8).toUpperCase()}
          </p>
        </>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <>
          <XCircle size={48} color="#EF4444" />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
            Le paiement a &eacute;chou&eacute;
          </p>
          <button
            onClick={onRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#EF9F27',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> R&eacute;essayer
          </button>
        </>
      )}
    </div>
  )
}
