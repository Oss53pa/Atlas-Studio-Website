import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PaymentTransaction } from '../types/payment'

export function usePaymentStatus(transactionId: string) {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!transactionId) return
    supabase.from('payment_transactions').select('*').eq('id', transactionId).single().then(({ data }) => {
      setTransaction(data as PaymentTransaction | null)
      setLoading(false)
    })

    const channel = supabase.channel(`payment-${transactionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payment_transactions', filter: `id=eq.${transactionId}` },
        (payload) => setTransaction(payload.new as PaymentTransaction))
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [transactionId])

  return { transaction, loading }
}
