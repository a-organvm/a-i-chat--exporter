import { GM_xmlhttpRequest } from 'vite-plugin-monkey/dist/client'

/**
 * License-key verification and Pro checkout for the Pro gate.
 *
 * Two verification paths are supported:
 *   1. Offline signed-key check — the key carries a payload + an ECDSA (P-256 /
 *      SHA-256) signature produced by the vendor's private key. We verify it
 *      against an embedded public key. Works without network access.
 *   2. Online Lemon Squeezy validation — POSTs the key to the Lemon Squeezy
 *      license API, activates inactive keys once, and trusts the `active`
 *      status for verified keys/instances.
 *
 * Both paths **fail closed**: any malformed key, bad signature, expired licence,
 * network error, activation rejection, or unexpected response downgrades the user to the free tier.
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
    /** Lemon Squeezy instance id activated for this browser, when available. */
    instanceId?: string
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
const LEMON_SQUEEZY_ACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/activate'

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
            decoded.signature,
            decoded.signedData,
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

interface LemonSqueezyLicenseKey {
    status?: string
}

interface LemonSqueezyInstance {
    id?: string
}

interface LemonSqueezyResponse {
    valid?: boolean
    activated?: boolean
    error?: string | null
    license_key?: LemonSqueezyLicenseKey
    instance?: LemonSqueezyInstance | null
    meta?: { customer_email?: string }
}

function serializeBody(body: BodyInit | null | undefined) {
    if (typeof body === 'string') return body
    if (body instanceof URLSearchParams) return body.toString()
    return undefined
}

function createGmFetch(): typeof fetch | undefined {
    if (typeof GM_xmlhttpRequest !== 'function') return undefined

    return ((input: RequestInfo | URL, init: RequestInit = {}) => {
        return new Promise<Response>((resolve, reject) => {
            const headers = new Headers(init.headers)
            const headerRecord: Record<string, string> = {}
            headers.forEach((value, key) => {
                headerRecord[key] = value
            })

            GM_xmlhttpRequest({
                method: init.method ?? 'GET',
                url: input.toString(),
                headers: headerRecord,
                data: serializeBody(init.body),
                timeout: 15_000,
                onload: (response) => {
                    resolve(new Response(response.responseText ?? '', {
                        status: response.status,
                        statusText: response.statusText,
                    }))
                },
                onerror: () => reject(new Error('gm-request-error')),
                ontimeout: () => reject(new Error('gm-request-timeout')),
            })
        })
    }) as typeof fetch
}

function getLicenseFetch(fetchImpl?: typeof fetch) {
    if (fetchImpl) return fetchImpl

    const gmFetch = createGmFetch()
    if (gmFetch) return gmFetch

    return typeof fetch !== 'undefined' ? fetch : undefined
}

function lemonSqueezyStatusReason(data: LemonSqueezyResponse, preferError = false) {
    if (preferError && data.error) return data.error

    const status = data.license_key?.status
    if (status) return status
    if (data.error) return data.error
    return 'inactive'
}

function lemonSqueezyProStatus(data: LemonSqueezyResponse): LicenseStatus {
    return {
        valid: true,
        tier: 'pro',
        features: [...PRO_FEATURES],
        instanceId: data.instance?.id,
        payload: { tier: 'pro', sub: data.meta?.customer_email },
    }
}

export function defaultLicenseInstanceName() {
    const host = typeof location !== 'undefined' ? location.hostname : ''
    return host ? `ChatGPT Exporter on ${host}` : 'ChatGPT Exporter'
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

    const doFetch = getLicenseFetch(opts.fetchImpl)
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
        if (!data) return freeStatus('inactive')
        if (data.valid !== true || data.license_key?.status !== 'active') {
            return freeStatus(lemonSqueezyStatusReason(data))
        }

        return lemonSqueezyProStatus(data)
    }
    catch {
        return freeStatus('network-error')
    }
}

/**
 * Activate an inactive Lemon Squeezy license for this browser and return the
 * created instance id so future checks can validate that exact activation.
 */
export async function activateWithLemonSqueezy(
    key: string,
    opts: { fetchImpl?: typeof fetch, url?: string, instanceName?: string } = {},
): Promise<LicenseStatus> {
    if (!key || typeof key !== 'string' || !key.trim()) return freeStatus('empty')

    const doFetch = getLicenseFetch(opts.fetchImpl)
    if (!doFetch) return freeStatus('fetch-unavailable')

    try {
        const body = new URLSearchParams({
            license_key: key.trim(),
            instance_name: opts.instanceName ?? defaultLicenseInstanceName(),
        })

        const res = await doFetch(opts.url ?? LEMON_SQUEEZY_ACTIVATE_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        })
        if (!res.ok) return freeStatus(`http-${res.status}`)

        const data = await res.json() as LemonSqueezyResponse
        if (!data) return freeStatus('inactive')
        if (data.activated !== true || data.license_key?.status !== 'active' || !data.instance?.id) {
            return freeStatus(lemonSqueezyStatusReason(data, true))
        }

        return lemonSqueezyProStatus(data)
    }
    catch {
        return freeStatus('network-error')
    }
}

/**
 * Verify a stored licence key. Tries the offline signed-key check first (so a
 * valid signed key works without network), then falls back to Lemon Squeezy when
 * `online` is enabled. Lemon validation checks a stored instance first, then the
 * raw key, then activates inactive keys once. Always fails closed to the free tier.
 */
export async function verifyLicense(
    key: string | null | undefined,
    opts: {
        publicKeyJwk?: JsonWebKey | null
        now?: number
        online?: boolean
        fetchImpl?: typeof fetch
        instanceId?: string
        instanceName?: string
        activate?: boolean
    } = {},
): Promise<LicenseStatus> {
    if (!key || typeof key !== 'string' || !key.trim()) return freeStatus('empty')

    const signed = await verifySignedLicense(key, { publicKeyJwk: opts.publicKeyJwk, now: opts.now })
    if (signed.valid) return signed

    if (opts.online) {
        if (opts.instanceId) {
            const validatedInstance = await validateWithLemonSqueezy(key, {
                fetchImpl: opts.fetchImpl,
                instanceId: opts.instanceId,
            })
            if (validatedInstance.valid) return validatedInstance
        }

        const validatedLicense = await validateWithLemonSqueezy(key, { fetchImpl: opts.fetchImpl })
        if (validatedLicense.valid) return validatedLicense

        if (opts.activate !== false && validatedLicense.reason === 'inactive') {
            const activated = await activateWithLemonSqueezy(key, {
                fetchImpl: opts.fetchImpl,
                instanceName: opts.instanceName,
            })
            if (activated.valid) return activated
        }

        return validatedLicense
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
