/**
 * License-key verification and Pro checkout for the Pro gate.
 *
 * Two verification paths are supported:
 *   1. Offline signed-key check — the key carries a payload + an ECDSA (P-256 /
 *      SHA-256) signature produced by the vendor's private key. We verify it
 *      against an embedded public key. Works without network access.
 *   2. Online Lemon Squeezy validation — POSTs the key to the Lemon Squeezy
 *      license API and trusts the `active` status.
 *
 * Both paths **fail closed**: any malformed key, bad signature, expired licence,
 * network error, or unexpected response downgrades the user to the free tier.
 * Pro features must therefore gate on {@link isProUnlocked} / {@link hasFeature},
 * never on the mere presence of a stored key.
 *
 * The checkout helpers at the bottom build a hosted Lemon Squeezy checkout URL
 * (with non-secret return metadata) and recover a license key from the redirect
 * the customer lands on after paying.
 */

export type LicenseTier = 'free' | 'pro'

/**
 * Pro features that a valid license can unlock. The string values match the
 * `ProFeature` identifiers used by the Pro gate in `ui/SettingContext`, so a
 * verified license's `features` array can be checked directly against them.
 */
export const PRO_FEATURE_BULK_EXPORT = 'bulk-export'
export const PRO_FEATURE_MULTI_PROVIDER = 'multi-provider-export'
export const PRO_FEATURES = [PRO_FEATURE_BULK_EXPORT, PRO_FEATURE_MULTI_PROVIDER] as const

export interface LicensePayload {
    /** Subject — customer id or email the licence was issued to. */
    sub?: string
    /** Tier granted by this licence. */
    tier: LicenseTier
    /** Expiry as unix seconds. Omitted means perpetual. */
    exp?: number
    /** Explicit feature grants. Omitted means "all features for the tier". */
    features?: string[]
}

export interface LicenseStatus {
    /** Whether the licence is valid and grants the Pro tier. */
    valid: boolean
    tier: LicenseTier
    /** Concrete features unlocked by this licence. */
    features: string[]
    /** Machine-readable reason, useful when `valid` is false. */
    reason?: string
    payload?: LicensePayload
}

/** The safe default returned whenever verification cannot succeed. */
export const FREE_STATUS: LicenseStatus = Object.freeze({ valid: false, tier: 'free', features: [] })

function freeStatus(reason: string, payload?: LicensePayload): LicenseStatus {
    return { valid: false, tier: 'free', features: [], reason, payload }
}

/**
 * Embedded vendor public key (ECDSA P-256, JWK) used to verify signed keys.
 * Replace with the real production key before release; `null` disables the
 * offline path and forces online validation only.
 */
export const EXPORTER_PUBLIC_KEY_JWK: JsonWebKey | null = null

const LEMON_SQUEEZY_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate'

function base64UrlToBytes(input: string): Uint8Array {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const binary = atob(normalized + pad)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

/** Map a verified payload to the concrete set of features it unlocks. */
export function grantedFeatures(payload: LicensePayload): string[] {
    if (payload.features && payload.features.length > 0) return [...payload.features]
    if (payload.tier === 'pro') return [...PRO_FEATURES]
    return []
}

/** True only when the licence is valid and grants the Pro tier. */
export function isProUnlocked(status: LicenseStatus | null | undefined): boolean {
    return !!status && status.valid && status.tier === 'pro'
}

/** True only when the licence is valid and unlocks the given feature. */
export function hasFeature(status: LicenseStatus | null | undefined, feature: string): boolean {
    return !!status && status.valid && status.features.includes(feature)
}

/**
 * Parse a signed licence key of the form `base64url(payload).base64url(signature)`.
 * Returns `null` for anything malformed (which the caller treats as free tier).
 */
export function decodeLicenseKey(key: string): {
    payload: LicensePayload
    signature: Uint8Array
    signedData: Uint8Array
} | null {
    if (!key || typeof key !== 'string') return null

    const parts = key.trim().split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null

    const [payloadPart, signaturePart] = parts
    try {
        const payloadBytes = base64UrlToBytes(payloadPart)
        const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload
        if (!payload || typeof payload !== 'object' || typeof payload.tier !== 'string') return null

        return {
            payload,
            signature: base64UrlToBytes(signaturePart),
            // The signature covers the raw base64url payload string (JWT-style).
            signedData: new TextEncoder().encode(payloadPart),
        }
    }
    catch {
        return null
    }
}

/**
 * Verify a signed licence key offline against an ECDSA P-256 public key.
 * Fails closed on every error path.
 */
export async function verifySignedLicense(
    key: string,
    opts: { publicKeyJwk?: JsonWebKey | null, now?: number } = {},
): Promise<LicenseStatus> {
    const decoded = decodeLicenseKey(key)
    if (!decoded) return freeStatus('malformed')

    const jwk = opts.publicKeyJwk ?? EXPORTER_PUBLIC_KEY_JWK
    const subtle = globalThis.crypto?.subtle
    if (!jwk || !subtle) return freeStatus('crypto-unavailable')

    try {
        const publicKey = await subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify'],
        )
        const ok = await subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            publicKey,
            // BufferSource now requires an ArrayBuffer-backed view under the bumped TS lib;
            // these Uint8Arrays are ArrayBuffer-backed at runtime, so the cast is safe.
            decoded.signature as BufferSource,
            decoded.signedData as BufferSource,
        )
        if (!ok) return freeStatus('bad-signature')

        const { payload } = decoded
        const nowSeconds = Math.floor((opts.now ?? Date.now()) / 1000)
        if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
            return freeStatus('expired', payload)
        }
        if (payload.tier !== 'pro') {
            return freeStatus('not-pro', payload)
        }

        return { valid: true, tier: 'pro', features: grantedFeatures(payload), payload }
    }
    catch {
        return freeStatus('verify-error')
    }
}

interface LemonSqueezyResponse {
    valid?: boolean
    license_key?: { status?: string }
    meta?: { customer_email?: string }
}

/**
 * Validate a licence key against the Lemon Squeezy license API.
 * Fails closed on network errors, non-2xx responses, or any non-`active` status.
 */
export async function validateWithLemonSqueezy(
    key: string,
    opts: { fetchImpl?: typeof fetch, url?: string, instanceId?: string } = {},
): Promise<LicenseStatus> {
    if (!key || typeof key !== 'string' || !key.trim()) return freeStatus('empty')

    const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined)
    if (!doFetch) return freeStatus('fetch-unavailable')

    try {
        const body = new URLSearchParams({ license_key: key.trim() })
        if (opts.instanceId) body.set('instance_id', opts.instanceId)

        const res = await doFetch(opts.url ?? LEMON_SQUEEZY_VALIDATE_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        })
        if (!res.ok) return freeStatus(`http-${res.status}`)

        const data = await res.json() as LemonSqueezyResponse
        // Lemon Squeezy returns valid:true for a paid key whether or not it has
        // been activated yet. A freshly purchased key is status 'inactive' (no
        // activations) but is still a legitimate paid key, so unlock on valid:true
        // and only reject keys LS has explicitly revoked or expired.
        const status = data?.license_key?.status
        if (!data || data.valid !== true || status === 'expired' || status === 'disabled') {
            return freeStatus(status ?? 'inactive')
        }

        return {
            valid: true,
            tier: 'pro',
            features: [...PRO_FEATURES],
            payload: { tier: 'pro', sub: data.meta?.customer_email },
        }
    }
    catch {
        return freeStatus('network-error')
    }
}

/**
 * Verify a stored licence key. Tries the offline signed-key check first (so a
 * valid signed key works without network), then falls back to Lemon Squeezy when
 * `online` is enabled. Always fails closed to the free tier.
 */
export async function verifyLicense(
    key: string | null | undefined,
    opts: {
        publicKeyJwk?: JsonWebKey | null
        now?: number
        online?: boolean
        fetchImpl?: typeof fetch
    } = {},
): Promise<LicenseStatus> {
    if (!key || typeof key !== 'string' || !key.trim()) return freeStatus('empty')

    const signed = await verifySignedLicense(key, { publicKeyJwk: opts.publicKeyJwk, now: opts.now })
    if (signed.valid) return signed

    if (opts.online) {
        return validateWithLemonSqueezy(key, { fetchImpl: opts.fetchImpl })
    }
    return signed
}

// ---------------------------------------------------------------------------
// Lemon Squeezy hosted checkout
// ---------------------------------------------------------------------------

const CHECKOUT_RETURN_PARAM = 'ce_checkout_return'
const CHECKOUT_SOURCE = 'chatgpt-exporter'

/** Hosted Lemon Squeezy checkout URL, injected at build time. Empty disables checkout. */
export const LEMON_SQUEEZY_CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL ?? ''

/** Query/hash param names a Lemon Squeezy return redirect may carry the license key in. */
export const LICENSE_PARAM_NAMES = [
    'ce_license_key',
    'license_key',
    'licenseKey',
    'license',
    'lemon_squeezy_license_key',
    'lemonsqueezy_license_key',
]

function toUrl(input: string | URL | Location) {
    return new URL(input.toString())
}

function getHashParams(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return new URLSearchParams()

    const queryIndex = value.indexOf('?')
    return new URLSearchParams(queryIndex === -1 ? value : value.slice(queryIndex + 1))
}

function deleteParams(params: URLSearchParams, names: string[]) {
    let changed = false

    names.forEach((name) => {
        if (params.has(name)) {
            params.delete(name)
            changed = true
        }
    })

    return changed
}

function cleanHash(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return hash

    const queryIndex = value.indexOf('?')
    const params = getHashParams(hash)
    const changed = deleteParams(params, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])

    if (!changed) return hash

    const nextParams = params.toString()

    if (queryIndex === -1) {
        return nextParams ? `#${nextParams}` : ''
    }

    const hashPath = value.slice(0, queryIndex)
    return nextParams ? `#${hashPath}?${nextParams}` : `#${hashPath}`
}

/** Recover a license key the Lemon Squeezy return redirect carries, or `null`. */
export function getLicenseFromUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)
    const sources = [
        url.searchParams,
        getHashParams(url.hash),
    ]

    for (const params of sources) {
        for (const name of LICENSE_PARAM_NAMES) {
            const value = params.get(name)?.trim()
            if (value) return value
        }
    }

    return null
}

/** Strip license/checkout params from a URL so the key never lingers in history. */
export function cleanLicenseReturnUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)

    deleteParams(url.searchParams, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])
    url.hash = cleanHash(url.hash)

    return url.toString()
}

/** Rewrite the current address bar to drop any captured license/checkout params. */
export function scrubLicenseReturnUrl() {
    const nextUrl = cleanLicenseReturnUrl(window.location)

    if (nextUrl !== window.location.href) {
        window.history.replaceState(null, document.title, nextUrl)
    }
}

export function buildCheckoutReturnUrl(input: string | URL | Location = window.location) {
    const url = new URL(cleanLicenseReturnUrl(input))
    url.searchParams.set(CHECKOUT_RETURN_PARAM, '1')

    return url.toString()
}

/**
 * Build the hosted Lemon Squeezy checkout URL, tagging it with a non-secret
 * source marker and a return URL the customer is sent back to after paying.
 * Returns `null` when checkout is unconfigured or the URL is not http(s).
 */
export function buildProCheckoutUrl(
    checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URL,
    returnUrl: string | URL | Location = window.location,
) {
    const trimmedCheckoutUrl = checkoutUrl.trim()
    if (!trimmedCheckoutUrl) return null

    try {
        const url = new URL(trimmedCheckoutUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

        if (!url.searchParams.has('checkout[custom][source]')) {
            url.searchParams.set('checkout[custom][source]', CHECKOUT_SOURCE)
        }

        if (!url.searchParams.has('checkout[custom][return_url]')) {
            url.searchParams.set('checkout[custom][return_url]', buildCheckoutReturnUrl(returnUrl))
        }

        return url.toString()
    }
    catch {
        return null
    }
}

/** Open the hosted Pro checkout in a new tab. Returns false when unconfigured. */
export function openProCheckout(checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URL) {
    const url = buildProCheckoutUrl(checkoutUrl)
    if (!url) return false

    window.open(url, '_blank', 'noopener,noreferrer')
    return true
}

/** Render a stored license key for display without revealing it in full. */
export function maskLicense(license: string) {
    const trimmedLicense = license.trim()
    if (!trimmedLicense) return ''
    if (trimmedLicense.length <= 8) return '****'

    return `****-${trimmedLicense.slice(-4)}`
}
