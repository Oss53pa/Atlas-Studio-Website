import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Subscriber } from '../../types/newsletter'

export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchSubscribers = useCallback(async (search = '', status = 'all') => {
    setLoading(true)
    let query = supabase.from('newsletter_subscribers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (status !== 'all') query = query.eq('status', status)
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    const { data, count } = await query.limit(200)
    setSubscribers((data as Subscriber[]) || [])
    setTotal(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSubscribers() }, [fetchSubscribers])

  const addSubscriber = useCallback(async (email: string, fullName?: string) => {
    const { data, error } = await supabase.from('newsletter_subscribers').insert({ email, full_name: fullName, status: 'active', source: 'manual' }).select().single()
    if (data) setSubscribers(prev => [data as Subscriber, ...prev])
    return { data, error }
  }, [])

  const deleteSubscriber = useCallback(async (id: string) => {
    await supabase.from('newsletter_subscribers').delete().eq('id', id)
    setSubscribers(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateSubscriberStatus = useCallback(async (id: string, status: string) => {
    await supabase.from('newsletter_subscribers').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setSubscribers(prev => prev.map(s => s.id === id ? { ...s, status: status as Subscriber['status'] } : s))
  }, [])

  const stats = {
    total,
    active: subscribers.filter(s => s.status === 'active').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
    bounced: subscribers.filter(s => s.status === 'bounced').length,
  }

  return { subscribers, loading, stats, fetchSubscribers, addSubscriber, deleteSubscriber, updateSubscriberStatus }
}
