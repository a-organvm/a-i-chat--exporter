/**
 * Licence signing — the private half of the Exporter's offline licence check.
 *
 * The mint holds the ECDSA P-256 signing key; the userscript verifies the token
 * we produce against the matching public key with `verifySignedLicense`, fully
 * offline. No Lemon Squeezy, no network round-trip, no payment processor.
 *
 * Token format — byte-for-byte what `src/utils/license.ts` verifies:
 *   base64url(JSON.stringify(payload)) + '.' + base64url(rawSignature)
 * The signature covers the UTF-8 bytes of the base64url payload string
 * (JWT-style), as raw IEEE-P1363 r‖s — exactly what WebCrypto `subtle.verify`
 * with { name: 'ECDSA', hash: 'SHA-256' } expects.
 */

const subtle = globalThis.crypto.subtle
const enc = new TextEncoder()

export type LicenseTier = 'free' | 'pro'

export interface LicensePayload {
    /** Subject — the buyer's email or customer id the licence is issued to. */
    sub?: string
    /** Tier granted. The mint only ever issues `pro`. */
    tier: LicenseTier
    /** Expiry as unix seconds. Omitted = perpetual. */
    exp?: number
    /** Explicit feature grants. Omitted = all features for the tier. */
    features?: string[]
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Sign a payload into a `payload.signature` licence key. */
export async function signLicense(payload: LicensePayload, signingKey: CryptoKey): Promise<string> {
    const payloadPart = bytesToBase64Url(enc.encode(JSON.stringify(payload)))
    const signature = await subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        signingKey,
        enc.encode(payloadPart),
    )
    return `${payloadPart}.${bytesToBase64Url(new Uint8Array(signature))}`
}

export interface MintLicenseInput {
    sub?: string
    /** Lifetime in days from `now`. 0 / omitted = perpetual. */
    ttlDays?: number
    features?: string[]
    /** Issue time in unix ms (injectable for tests). Defaults to wall clock. */
    now?: number
}

/** Build and sign a Pro licence. */
export async function mintProLicense(input: MintLicenseInput, signingKey: CryptoKey): Promise<string> {
    const payload: LicensePayload = { tier: 'pro' }
    if (input.sub) payload.sub = input.sub
    if (input.features && input.features.length > 0) payload.features = input.features
    if (input.ttlDays && input.ttlDays > 0) {
        const issuedMs = input.now ?? Date.now()
        payload.exp = Math.floor(issuedMs / 1000) + input.ttlDays * 24 * 60 * 60
    }
    return signLicense(payload, signingKey)
}
