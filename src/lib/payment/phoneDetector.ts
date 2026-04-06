export interface PhoneDetection {
  operator: string
  country: string
  formatted: string
  valid: boolean
}

const PREFIXES: { pattern: RegExp; operator: string; country: string }[] = [
  // Côte d'Ivoire
  { pattern: /^(\+?225)?(07|08|09)\d{8}$/, operator: 'orange_money', country: 'CI' },
  { pattern: /^(\+?225)?(05|06)\d{8}$/, operator: 'mtn_momo', country: 'CI' },
  { pattern: /^(\+?225)?(01|41)\d{8}$/, operator: 'wave', country: 'CI' },
  // Sénégal
  { pattern: /^(\+?221)?(77|78|76)\d{7}$/, operator: 'orange_money', country: 'SN' },
  { pattern: /^(\+?221)?70\d{7}$/, operator: 'wave', country: 'SN' },
  // Cameroun
  { pattern: /^(\+?237)?6(7|8|9)\d{7}$/, operator: 'mtn_momo', country: 'CM' },
  { pattern: /^(\+?237)?6(9|5)\d{7}$/, operator: 'orange_money', country: 'CM' },
]

export function detectOperator(phone: string): PhoneDetection {
  const cleaned = phone.replace(/[\s\-().]/g, '')
  for (const { pattern, operator, country } of PREFIXES) {
    if (pattern.test(cleaned)) {
      return { operator, country, formatted: formatPhone(cleaned, country), valid: true }
    }
  }
  return { operator: 'unknown', country: 'unknown', formatted: cleaned, valid: false }
}

function formatPhone(phone: string, country: string): string {
  const codes: Record<string, string> = { CI: '+225', SN: '+221', CM: '+237' }
  const code = codes[country] || ''
  if (phone.startsWith('+')) return phone
  if (phone.startsWith('00')) return '+' + phone.slice(2)
  return code + phone
}

export function calculateFees(amount: number, method: string): number {
  const rates: Record<string, number> = {
    orange_money: 0.025,
    mtn_momo: 0.025,
    wave: 0.01,
    moov_money: 0.025,
    card_visa: 0.035,
    card_mastercard: 0.035,
    wire_transfer: 0,
    manual: 0,
  }
  const rate = rates[method] || 0.03
  const fixedFee = method.startsWith('card') ? 100 : 0
  return Math.round(amount * rate + fixedFee)
}
