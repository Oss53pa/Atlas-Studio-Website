import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Plan } from '../types/plans'

export function usePlanComparison(productId: string) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    supabase.from('plans')
      .select('*, plan_features(*, features(key, name, category, feature_type, is_core, sort_order))')
      .eq('product_id', productId).eq('active', true).order('sort_order')
      .then(({ data }) => { setPlans((data as Plan[]) || []); setLoading(false) })
  }, [productId])

  return { plans, loading }
}
