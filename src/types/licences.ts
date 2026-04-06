export interface Licence {
  id: string
  tenant_id: string
  product_id: string
  plan_id: string
  subscription_id: string
  activation_key: string
  key_hash: string
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired'
  max_seats: number
  used_seats: number
  activated_at?: string
  expires_at?: string
  suspended_at?: string
  revoked_at?: string
  revocation_reason?: string
  suspension_reason?: string
  activated_by?: string
  created_by: string
  offline_token?: string
  offline_valid_days: number
  created_at: string
  updated_at: string
  // Joined
  tenants?: { name: string; email: string; country?: string }
  products?: { name: string; slug: string }
  plans?: { name: string; price_monthly_fcfa: number; max_seats: number }
}

export interface LicenceActivation {
  id: string
  licence_id: string
  tenant_id: string
  activated_by: string
  activation_key: string
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
  success: boolean
  failure_reason?: string
  created_at: string
}

export interface LicenceSeat {
  id: string
  licence_id: string
  tenant_id: string
  user_id?: string
  email: string
  full_name?: string
  role: 'app_super_admin' | 'app_admin' | 'editor' | 'viewer'
  status: 'active' | 'suspended' | 'revoked'
  invitation_token?: string
  invitation_sent_at?: string
  invitation_expires_at?: string
  invitation_accepted_at?: string
  last_login?: string
  login_count: number
  created_at: string
  updated_at: string
}

export interface AdminDelegateLink {
  id: string
  licence_id: string
  tenant_id: string
  created_by: string
  token: string
  token_hash: string
  can_invite_users: boolean
  can_manage_roles: boolean
  can_view_users: boolean
  can_revoke_users: boolean
  can_view_billing: boolean
  can_change_plan: boolean
  status: 'active' | 'used' | 'expired' | 'revoked'
  expires_at: string
  used_at?: string
  used_by?: string
  actions_log: unknown[]
  created_at: string
}

export interface LicenceAuditEntry {
  id: string
  licence_id: string
  tenant_id?: string
  actor_id?: string
  actor_type: 'system' | 'pamela' | 'tenant_admin' | 'tenant_user'
  action: string
  details: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface SeatQuota {
  can_add: boolean
  used: number
  max: number
  remaining: number
}

export interface LicenceOverviewKPIs {
  total_licences: number
  active_licences: number
  pending_activation: number
  expiring_soon: number
  total_seats_used: number
  total_seats_max: number
}

export const ROLE_LABELS: Record<string, string> = {
  app_super_admin: 'Super Admin',
  app_admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecteur',
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#F59E0B' },
  active: { label: 'Active', color: '#22C55E' },
  suspended: { label: 'Suspendue', color: '#EF4444' },
  revoked: { label: 'Révoquée', color: '#888888' },
  expired: { label: 'Expirée', color: '#C62828' },
}
