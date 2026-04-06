export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'wave' | 'moov_money' | 'card_visa' | 'card_mastercard' | 'wire_transfer' | 'manual'
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded' | 'partial_refund'

export interface PaymentTransaction {
  id: string
  tenant_id: string
  invoice_id?: string
  subscription_id?: string
  amount_fcfa: number
  amount_currency: string
  fees_fcfa: number
  net_amount_fcfa?: number
  method: PaymentMethod
  status: PaymentStatus
  provider?: string
  provider_transaction_id?: string
  provider_reference?: string
  provider_raw_response?: unknown
  phone_number?: string
  phone_operator?: string
  card_last4?: string
  card_brand?: string
  wire_reference?: string
  wire_confirmed_by?: string
  wire_confirmed_at?: string
  customer_ip?: string
  customer_country?: string
  refund_amount_fcfa?: number
  refund_reason?: string
  refunded_at?: string
  initiated_at: string
  confirmed_at?: string
  failed_at?: string
  created_at: string
  // Joined
  tenants?: { name: string; email: string; country?: string }
}

export interface PaymentSession {
  id: string
  tenant_id: string
  invoice_id?: string
  amount_fcfa: number
  description?: string
  items: unknown[]
  session_token: string
  status: 'open' | 'paid' | 'expired' | 'cancelled'
  transaction_id?: string
  selected_method?: string
  expires_at: string
  paid_at?: string
}

export interface SavedPaymentMethod {
  id: string
  tenant_id: string
  type: PaymentMethod
  phone_number?: string
  phone_label?: string
  operator?: string
  card_last4?: string
  card_brand?: string
  card_expiry?: string
  card_holder_name?: string
  is_default: boolean
}

export interface PaymentMethodInfo {
  id: string
  label: string
  color: string
  countries: string[]
  description: string
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { id: 'orange_money', label: 'Orange Money', color: '#FF6600', countries: ['CI','SN','ML','BF','GN','CM'], description: 'Paiement instantané via Orange Money' },
  { id: 'mtn_momo', label: 'MTN MoMo', color: '#FFCC00', countries: ['CI','GH','CM','UG','RW','ZM'], description: 'Paiement via MTN Mobile Money' },
  { id: 'wave', label: 'Wave', color: '#1BA5B8', countries: ['CI','SN','ML','BF','GN'], description: 'Paiement rapide via Wave' },
  { id: 'moov_money', label: 'Moov Money', color: '#0055A5', countries: ['CI','BJ','TG','BF','ML','NE','GA'], description: 'Paiement via Flooz Moov' },
  { id: 'card_visa', label: 'Carte Visa / Mastercard', color: '#1A1A2E', countries: ['ALL'], description: 'Carte bancaire internationale' },
  { id: 'wire_transfer', label: 'Virement bancaire', color: '#2A2A3A', countries: ['ALL'], description: 'Confirmation sous 2-3 jours ouvrés' },
]

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#F59E0B' },
  processing: { label: 'En cours', color: '#3B82F6' },
  success: { label: 'Confirmé', color: '#22C55E' },
  failed: { label: 'Échoué', color: '#EF4444' },
  cancelled: { label: 'Annulé', color: '#888888' },
  refunded: { label: 'Remboursé', color: '#8B5CF6' },
  partial_refund: { label: 'Remb. partiel', color: '#8B5CF6' },
}

export const METHOD_LABELS: Record<string, string> = {
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  wave: 'Wave',
  moov_money: 'Moov Money',
  card_visa: 'Carte Visa',
  card_mastercard: 'Carte Mastercard',
  wire_transfer: 'Virement',
  manual: 'Manuel',
}
