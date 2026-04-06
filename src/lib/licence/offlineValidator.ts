export interface OfflineValidationResult {
  valid: boolean
  reason?: string
  tenantId?: string
  productId?: string
  planId?: string
  expiresAt?: string
}

export async function validateLicenceOffline(
  offlineToken: string,
  secret: string
): Promise<OfflineValidationResult> {
  try {
    const decoded = JSON.parse(atob(offlineToken.replace(/-/g, '+').replace(/_/g, '/')))
    const { payload, sig } = decoded

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const sigBytes = new Uint8Array(
      (sig as string).match(/.{2}/g)!.map((b: string) => parseInt(b, 16))
    )

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(JSON.stringify(payload))
    )

    if (!valid) return { valid: false, reason: 'Signature invalide' }

    if (new Date(payload.expiresAt) < new Date()) {
      return { valid: false, reason: 'Token offline expiré — connexion internet requise pour renouveler' }
    }

    return {
      valid: true,
      tenantId: payload.tenantId,
      productId: payload.productId,
      planId: payload.planId,
      expiresAt: payload.expiresAt,
    }
  } catch {
    return { valid: false, reason: 'Token invalide' }
  }
}
