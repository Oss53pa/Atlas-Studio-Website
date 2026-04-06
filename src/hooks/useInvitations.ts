import { useCallback } from 'react'
import { apiCall } from '../lib/api'

interface InviteParams {
  licence_id: string
  tenant_id: string
  email: string
  full_name?: string
  role?: string
  send_email?: boolean
}

export function useInvitations() {
  const invite = useCallback(async (params: InviteParams) => {
    return apiCall<{ success: boolean; seat: unknown; invite_url: string }>('invite-user', {
      method: 'POST',
      body: params,
    })
  }, [])

  const acceptInvitation = useCallback(async (token: string, password?: string, firstName?: string, lastName?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${supabaseUrl}/functions/v1/accept-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify({ token, password, first_name: firstName, last_name: lastName }),
    })
    return res.json()
  }, [])

  return { invite, acceptInvitation }
}
