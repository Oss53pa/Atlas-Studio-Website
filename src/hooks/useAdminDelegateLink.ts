import { useState, useCallback } from 'react'
import { apiCall } from '../lib/api'
import type { AdminDelegateLink } from '../types/licences'
import { supabase } from '../lib/supabase'

export function useAdminDelegateLink(licenceId: string) {
  const [link, setLink] = useState<AdminDelegateLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminUrl, setAdminUrl] = useState<string | null>(null)

  const fetchLink = useCallback(async () => {
    if (!licenceId) return
    setLoading(true)
    const { data } = await supabase.from('admin_delegate_links').select('*').eq('licence_id', licenceId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
    setLink(data as AdminDelegateLink | null)
    if (data?.token) setAdminUrl(`https://atlas-studio.org/admin-access/${data.token}`)
    setLoading(false)
  }, [licenceId])

  const generateLink = useCallback(async () => {
    const result = await apiCall<{ success: boolean; link: AdminDelegateLink; admin_url: string }>('generate-admin-link', { method: 'POST', body: { licence_id: licenceId } })
    setLink(result.link)
    setAdminUrl(result.admin_url)
    return result
  }, [licenceId])

  return { link, adminUrl, loading, fetchLink, generateLink }
}
