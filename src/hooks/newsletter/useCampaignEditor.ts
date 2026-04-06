import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { generateEmailHtml } from '../../lib/newsletter/htmlGenerator'
import type { Campaign, EmailBlock } from '../../types/newsletter'

export function useCampaignEditor(campaignId: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!campaignId) return
    supabase.from('newsletter_campaigns').select('*').eq('id', campaignId).single().then(({ data }) => {
      if (data) {
        setCampaign(data as Campaign)
        setBlocks((data as Campaign).blocks || [])
      }
    })
  }, [campaignId])

  const scheduleSave = useCallback((updatedBlocks: EmailBlock[], updatedCampaign: Campaign) => {
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      const htmlBody = generateEmailHtml(updatedBlocks, updatedCampaign)
      await supabase.from('newsletter_campaigns').update({ blocks: updatedBlocks, html_body: htmlBody, updated_at: new Date().toISOString() }).eq('id', campaignId)
    }, 2000)
  }, [campaignId])

  const addBlock = useCallback((block: EmailBlock) => {
    setBlocks(prev => {
      const footerIdx = prev.findIndex(b => b.type === 'footer')
      const next = footerIdx >= 0 ? [...prev.slice(0, footerIdx), block, ...prev.slice(footerIdx)] : [...prev, block]
      if (campaign) scheduleSave(next, campaign)
      return next
    })
  }, [campaign, scheduleSave])

  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== blockId)
      if (campaign) scheduleSave(next, campaign)
      return next
    })
    if (selectedBlockId === blockId) setSelectedBlockId(null)
  }, [selectedBlockId, campaign, scheduleSave])

  const updateBlock = useCallback((blockId: string, props: Record<string, unknown>) => {
    setBlocks(prev => {
      const next = prev.map(b => b.id === blockId ? { ...b, props: { ...b.props, ...props } } as EmailBlock : b)
      if (campaign) scheduleSave(next, campaign)
      return next
    })
  }, [campaign, scheduleSave])

  const reorderBlocks = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks)
    if (campaign) scheduleSave(newBlocks, campaign)
  }, [campaign, scheduleSave])

  const updateCampaignMeta = useCallback((meta: Partial<Campaign>) => {
    setCampaign(prev => {
      if (!prev) return prev
      const next = { ...prev, ...meta }
      scheduleSave(blocks, next)
      return next
    })
  }, [blocks, scheduleSave])

  const saveCampaign = useCallback(async () => {
    if (!campaign) return
    setIsSaving(true)
    clearTimeout(saveTimeout.current)
    const htmlBody = generateEmailHtml(blocks, campaign)
    await supabase.from('newsletter_campaigns').update({ ...campaign, blocks, html_body: htmlBody, updated_at: new Date().toISOString() }).eq('id', campaignId)
    setIsSaving(false)
  }, [campaign, blocks, campaignId])

  return {
    campaign, blocks, selectedBlockId,
    addBlock, removeBlock, updateBlock, reorderBlocks,
    selectBlock: setSelectedBlockId,
    updateCampaignMeta, saveCampaign, isSaving
  }
}
