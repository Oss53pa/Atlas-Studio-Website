import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Campaign } from '../../types/newsletter'

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    setCampaigns((data as Campaign[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const deleteCampaign = useCallback(async (id: string) => {
    await supabase.from('newsletter_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }, [])

  const duplicateCampaign = useCallback(async (campaign: Campaign) => {
    const { id, created_at, updated_at, sent_at, ...rest } = campaign
    const { data } = await supabase
      .from('newsletter_campaigns')
      .insert({ ...rest, name: `${campaign.name} (copie)`, status: 'draft', recipient_count: 0, delivered_count: 0, open_count: 0, unique_open_count: 0, click_count: 0, unique_click_count: 0, unsubscribe_count: 0, bounce_count: 0, spam_count: 0 })
      .select()
      .single()
    if (data) setCampaigns(prev => [data as Campaign, ...prev])
    return data as Campaign | null
  }, [])

  return { campaigns, loading, fetchCampaigns, deleteCampaign, duplicateCampaign }
}
