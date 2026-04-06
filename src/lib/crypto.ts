export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateSecureToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, v => chars[v % chars.length]).join('')
}

export function generateActivationKey(productSlug: string, planName: string): string {
  const slug = productSlug.toUpperCase().slice(0, 8)
  const plan = planName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const part1 = generateSecureToken(8).toUpperCase()
  const part2 = generateSecureToken(8).toUpperCase()
  return `ATLAS-${slug}-${plan}-${part1}-${part2}`
}

export function maskActivationKey(key: string): string {
  const parts = key.split('-')
  if (parts.length < 5) return 'ATLAS-****-****-****-****'
  return `${parts[0]}-${parts[1]}-${parts[2]}-****-****`
}
