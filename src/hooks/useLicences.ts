import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Licence, LicenceOverviewKPIs } from '../types/licences'

export function useLicences(tenantId?: string) {
  const [licences, setLicences] = useState<Licence[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLicences = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('licences').select('*, tenants(name, email, country), products(name, slug), plans(name, price_monthly_fcfa, max_seats)').order('created_at', { ascending: false })
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query
    if (error) console.error('useLicences error:', error)
    setLicences((data as Licence[]) || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetchLicences() }, [fetchLicences])

  const kpis: LicenceOverviewKPIs = {
    total_licences: licences.length,
    active_licences: licences.filter(l => l.status === 'active').length,
    pending_activation: licences.filter(l => l.status === 'pending').length,
    expiring_soon: licences.filter(l => l.expires_at && new Date(l.expires_at).getTime() - Date.now() < 30 * 86400000 && l.status === 'active').length,
    total_seats_used: licences.reduce((s, l) => s + l.used_seats, 0),
    total_seats_max: licences.reduce((s, l) => s + l.max_seats, 0),
  }

  return { licences, loading, kpis, fetchLicences }
}
