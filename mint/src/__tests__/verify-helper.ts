/**
 * Independent verifier mirroring `src/utils/license.ts::verifySignedLicense`
 * (same ECDSA P-256 / SHA-256 params, same base64url layout). Pinning the format
 * from the *verify* side here, while the product's own test pins it from the
 * *sign* side, guarantees a mint-signed licence is one the product accepts.
 */

const subtle = globalThis.crypto.subtle

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const binary = atob(normalized + pad)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

interface DecodedPayload {
    tier?: string
    exp?: number
    sub?: string
    features?: string[]
}

export interface VerifyResult {
    valid: boolean
    tier?: string
    reason?: string
    payload?: DecodedPayload
}

export async function verifyLikeProduct(
    key: string,
    publicJwk: JsonWebKey,
    nowMs: number = Date.now(),
): Promise<VerifyResult> {
    const parts = key.split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, reason: 'malformed' }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as DecodedPayload
    const signature = base64UrlToBytes(parts[1])
    const publicKey = await subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signature,
        new TextEncoder().encode(parts[0]),
    )
    if (!ok) return { valid: false, reason: 'bad-signature', payload }

    const nowS = Math.floor(nowMs / 1000)
    if (typeof payload.exp === 'number' && payload.exp < nowS) return { valid: false, reason: 'expired', payload }
    if (payload.tier !== 'pro') return { valid: false, reason: 'not-pro', payload }
    return { valid: true, tier: 'pro', payload }
}
