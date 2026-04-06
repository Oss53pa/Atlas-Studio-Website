export interface Plan {
  id: string
  product_id: string
  name: string
  display_name?: string
  description?: string
  is_popular: boolean
  is_custom: boolean
  price_monthly_fcfa?: number
  price_annual_fcfa?: number
  annual_discount_pct: number
  max_seats: number
  storage_gb: number
  api_calls_monthly: number
  active: boolean
  sort_order: number
  plan_features?: PlanFeature[]
}

export interface Feature {
  id: string
  product_id: string
  key: string
  name: string
  description?: string
  category?: string
  feature_type: 'boolean' | 'limit' | 'unlimited'
  limit_unit?: string
  is_core: boolean
  sort_order: number
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_id: string
  enabled: boolean
  limit_value?: number
  limit_unit?: string
  display_value?: string
  tooltip?: string
  features?: Feature
}

export interface Subscription {
  id: string
  tenant_id: string
  product_id: string
  plan_id: string
  billing_cycle: 'monthly' | 'annual'
  status: 'trial' | 'active' | 'past_due' | 'degraded' | 'suspended' | 'cancelled' | 'cancelled_eop'
  trial_ends_at?: string
  current_period_start: string
  current_period_end: string
  next_renewal_date?: string
  pending_plan_id?: string
  pending_billing_cycle?: string
  cancel_at_period_end: boolean
  cancellation_reason?: string
  usage_documents: number
  usage_api_calls: number
  usage_storage_mb: number
  mrr_fcfa: number
  created_at: string
  updated_at: string
  plans?: Plan
  products?: { name: string; slug: string }
  tenants?: { name: string; email: string }
}

export interface SubscriptionChange {
  id: string
  subscription_id: string
  change_type: 'upgrade' | 'downgrade' | 'cycle_change' | 'reactivation' | 'cancellation' | 'trial_conversion'
  from_plan_id?: string
  to_plan_id?: string
  effective_immediately: boolean
  effective_date?: string
  prorata_credit_fcfa: number
  prorata_charge_fcfa: number
  actor_type: string
  created_at: string
}

export interface ProrataResult {
  days_remaining: number
  credit_fcfa: number
  charge_fcfa: number
  net_fcfa: number
  is_upgrade: boolean
  supplement_fcfa: number
  avoir_fcfa: number
}

export interface FeatureAccessResult {
  allowed: boolean
  reason: string
  message?: string
  upgrade_required?: boolean
  used?: number
  limit?: number
  remaining?: number
}

export interface FeatureMap {
  [key: string]: {
    enabled: boolean
    limit?: number
    limitUnit?: string
    isDegraded: boolean
    isCore: boolean
  }
}

export const SUB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trial: { label: 'Essai', color: '#3B82F6' },
  active: { label: 'Actif', color: '#22C55E' },
  past_due: { label: 'En retard', color: '#F59E0B' },
  degraded: { label: 'Dégradé', color: '#E65100' },
  suspended: { label: 'Suspendu', color: '#EF4444' },
  cancelled: { label: 'Résilié', color: '#888888' },
  cancelled_eop: { label: 'Résiliation programmée', color: '#F59E0B' },
}
