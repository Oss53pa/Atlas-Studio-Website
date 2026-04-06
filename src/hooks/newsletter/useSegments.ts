import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Segment } from '../../types/newsletter'

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSegments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('newsletter_segments').select('*').order('name')
    setSegments((data as Segment[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSegments() }, [fetchSegments])

  return { segments, loading, fetchSegments }
}
