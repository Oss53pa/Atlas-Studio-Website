import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FeatureMap, FeatureAccessResult } from '../types/plans'

export function useFeatureAccess(productId: string, tenantId?: string) {
  const [features, setFeatures] = useState<FeatureMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId || !tenantId) return
    supabase.from('subscriptions')
      .select('status, plan_id, plans(name, max_seats, plan_features(enabled, limit_value, limit_unit, features(key, name, feature_type, is_core)))')
      .eq('tenant_id', tenantId).eq('product_id', productId)
      .in('status', ['active', 'trial', 'past_due', 'degraded'])
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data?.plans?.plan_features) {
          const map: FeatureMap = {}
          for (const pf of data.plans.plan_features as any[]) {
            map[pf.features.key] = { enabled: pf.enabled || pf.features.is_core, limit: pf.limit_value, limitUnit: pf.limit_unit, isDegraded: data.status === 'degraded', isCore: pf.features.is_core }
          }
          setFeatures(map)
        }
        setLoading(false)
      })
  }, [productId, tenantId])

  const canAccess = useCallback((key: string): FeatureAccessResult => {
    const f = features[key]
    if (!f) return { allowed: false, reason: 'unknown' }
    if (f.isDegraded) return { allowed: false, reason: 'degraded_mode' }
    if (!f.enabled) return { allowed: false, reason: 'not_in_plan', upgrade_required: true }
    return { allowed: true, reason: 'ok' }
  }, [features])

  return { canAccess, features, loading }
}
