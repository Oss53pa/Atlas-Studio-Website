import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Campaign, CampaignSend } from '../../types/newsletter'

export function useCampaignStats(campaignId: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sends, setSends] = useState<CampaignSend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!campaignId) return
    setLoading(true)
    Promise.all([
      supabase.from('newsletter_campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('newsletter_sends').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(500),
    ]).then(([campRes, sendsRes]) => {
      if (campRes.data) setCampaign(campRes.data as Campaign)
      if (sendsRes.data) setSends(sendsRes.data as CampaignSend[])
      setLoading(false)
    })
  }, [campaignId])

  const delivered = campaign?.delivered_count || 0
  const openRate = delivered > 0 ? ((campaign?.unique_open_count || 0) / delivered) * 100 : 0
  const clickRate = delivered > 0 ? ((campaign?.unique_click_count || 0) / delivered) * 100 : 0
  const ctor = (campaign?.unique_open_count || 0) > 0 ? ((campaign?.unique_click_count || 0) / (campaign?.unique_open_count || 1)) * 100 : 0
  const unsubRate = delivered > 0 ? ((campaign?.unsubscribe_count || 0) / delivered) * 100 : 0
  const bounceRate = delivered > 0 ? ((campaign?.bounce_count || 0) / delivered) * 100 : 0

  return { campaign, sends, loading, openRate, clickRate, ctor, unsubRate, bounceRate }
}
