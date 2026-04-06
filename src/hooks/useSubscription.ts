import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Subscription, ProrataResult } from '../types/plans'

export function useSubscription(tenantId?: string, productId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId) return
    let query = supabase.from('subscriptions').select('*, plans(*, plan_features(*, features(*))), products(name, slug)').eq('tenant_id', tenantId).in('status', ['active', 'trial', 'past_due', 'degraded', 'cancelled_eop']).order('created_at', { ascending: false }).limit(1)
    if (productId) query = query.eq('product_id', productId)
    const { data } = await query.single()
    setSubscription(data as Subscription | null)
    setLoading(false)
  }, [tenantId, productId])

  useEffect(() => { fetch() }, [fetch])

  const calculateProrata = useCallback(async (newPlanId: string, newCycle?: string) => {
    if (!subscription) return null
    const { data } = await supabase.rpc('calculate_prorata', { p_subscription_id: subscription.id, p_new_plan_id: newPlanId, p_new_cycle: newCycle })
    return data as ProrataResult | null
  }, [subscription])

  return { subscription, loading, refetch: fetch, calculateProrata }
}
