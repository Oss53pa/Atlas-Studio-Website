import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LicenceSeat, SeatQuota } from '../types/licences'

export function useSeats(licenceId: string) {
  const [seats, setSeats] = useState<LicenceSeat[]>([])
  const [quota, setQuota] = useState<SeatQuota | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSeats = useCallback(async () => {
    if (!licenceId) return
    setLoading(true)
    const { data } = await supabase.from('licence_seats').select('*').eq('licence_id', licenceId).order('created_at')
    setSeats((data as LicenceSeat[]) || [])
    setLoading(false)
  }, [licenceId])

  const fetchQuota = useCallback(async () => {
    if (!licenceId) return
    const { data } = await supabase.rpc('check_seat_quota', { p_licence_id: licenceId })
    setQuota(data as SeatQuota)
  }, [licenceId])

  useEffect(() => {
    fetchSeats()
    fetchQuota()

    const channel = supabase.channel(`seats-${licenceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'licence_seats', filter: `licence_id=eq.${licenceId}` }, () => { fetchSeats(); fetchQuota() })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [licenceId, fetchSeats, fetchQuota])

  return { seats, quota, loading, fetchSeats, fetchQuota }
}
