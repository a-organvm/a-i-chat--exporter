import { describe, expect, it } from 'vitest'
import {
    PRO_FEATURE_BULK_EXPORT,
    PRO_FEATURE_MULTI_PROVIDER,
    buildCheckoutReturnUrl,
    buildProCheckoutUrl,
    captureLicenseFromUrl,
    cleanLicenseReturnUrl,
    decodeLicenseKey,
    getLicenseFromUrl,
    grantedFeatures,
    hasFeature,
    isProUnlocked,
    maskLicense,
    validateWithLemonSqueezy,
    verifyLicense,
    verifySignedLicense,
} from '../utils/license'
import type { LicensePayload } from '../utils/license'

const subtle = globalThis.crypto.subtle
const enc = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function makeKeyPair() {
    return subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>
}

/** Produce a `payload.signature` key signed with the given private key. */
async function signLicense(payload: LicensePayload, privateKey: CryptoKey): Promise<string> {
    const payloadPart = bytesToBase64Url(enc.encode(JSON.stringify(payload)))
    const signature = await subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        enc.encode(payloadPart),
    )
    return `${payloadPart}.${bytesToBase64Url(new Uint8Array(signature))}`
}

const NOW_MS = 1_700_000_000_000 // fixed "now" for deterministic expiry checks
const NOW_S = Math.floor(NOW_MS / 1000)

describe('isProUnlocked / hasFeature', () => {
    it('treats null/free status as locked', () => {
        expect(isProUnlocked(null)).toBe(false)
        expect(isProUnlocked({ valid: false, tier: 'free', features: [] })).toBe(false)
        expect(hasFeature(null, PRO_FEATURE_BULK_EXPORT)).toBe(false)
    })

    it('unlocks only granted features on a valid pro status', () => {
        const status = { valid: true, tier: 'pro' as const, features: [PRO_FEATURE_BULK_EXPORT] }
        expect(isProUnlocked(status)).toBe(true)
        expect(hasFeature(status, PRO_FEATURE_BULK_EXPORT)).toBe(true)
        expect(hasFeature(status, PRO_FEATURE_MULTI_PROVIDER)).toBe(false)
    })
})

describe('grantedFeatures', () => {
    it('grants all pro features when none are listed', () => {
        expect(grantedFeatures({ tier: 'pro' })).toEqual([PRO_FEATURE_BULK_EXPORT, PRO_FEATURE_MULTI_PROVIDER])
    })

    it('grants only the explicitly listed features', () => {
        expect(grantedFeatures({ tier: 'pro', features: [PRO_FEATURE_BULK_EXPORT] })).toEqual([PRO_FEATURE_BULK_EXPORT])
    })

    it('grants nothing for a free payload', () => {
        expect(grantedFeatures({ tier: 'free' })).toEqual([])
    })
})

describe('decodeLicenseKey', () => {
    it('returns null for malformed input', () => {
        expect(decodeLicenseKey('')).toBeNull()
        expect(decodeLicenseKey('no-dot')).toBeNull()
        expect(decodeLicenseKey('a.b.c')).toBeNull()
        expect(decodeLicenseKey('!!!.@@@')).toBeNull()
    })

    it('decodes a well-formed payload', () => {
        const payloadPart = bytesToBase64Url(enc.encode(JSON.stringify({ tier: 'pro' })))
        const decoded = decodeLicenseKey(`${payloadPart}.AAAA`)
        expect(decoded?.payload.tier).toBe('pro')
    })
})

describe('verifySignedLicense (offline)', () => {
    it('verifies a valid signed pro key and unlocks all features', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro', sub: 'a@b.com' }, privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk, now: NOW_MS })
        expect(status.valid).toBe(true)
        expect(status.tier).toBe('pro')
        expect(status.features).toEqual([PRO_FEATURE_BULK_EXPORT, PRO_FEATURE_MULTI_PROVIDER])
    })

    it('honors explicit feature grants', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro', features: [PRO_FEATURE_BULK_EXPORT] }, privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk, now: NOW_MS })
        expect(status.features).toEqual([PRO_FEATURE_BULK_EXPORT])
    })

    it('fails closed on an expired key', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro', exp: NOW_S - 10 }, privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk, now: NOW_MS })
        expect(status.valid).toBe(false)
        expect(status.tier).toBe('free')
        expect(status.reason).toBe('expired')
    })

    it('accepts a key that has not yet expired', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro', exp: NOW_S + 1000 }, privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk, now: NOW_MS })
        expect(status.valid).toBe(true)
    })

    it('fails closed when the signature does not match the key', async () => {
        const signer = await makeKeyPair()
        const attacker = await makeKeyPair()
        const wrongJwk = await subtle.exportKey('jwk', attacker.publicKey)
        const key = await signLicense({ tier: 'pro' }, signer.privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk: wrongJwk, now: NOW_MS })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('bad-signature')
    })

    it('fails closed on a tampered payload', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro' }, privateKey)
        // swap the signed payload for a forged "pro" payload, keeping the signature
        const forgedPayload = bytesToBase64Url(enc.encode(JSON.stringify({ tier: 'pro', sub: 'hacker' })))
        const tampered = `${forgedPayload}.${key.split('.')[1]}`

        const status = await verifySignedLicense(tampered, { publicKeyJwk, now: NOW_MS })
        expect(status.valid).toBe(false)
    })

    it('fails closed for a free-tier payload even if validly signed', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'free' }, privateKey)

        const status = await verifySignedLicense(key, { publicKeyJwk, now: NOW_MS })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('not-pro')
    })

    it('fails closed when no public key is configured', async () => {
        const { privateKey } = await makeKeyPair()
        const key = await signLicense({ tier: 'pro' }, privateKey)

        const status = await verifySignedLicense(key, { now: NOW_MS })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('crypto-unavailable')
    })
})

describe('validateWithLemonSqueezy (online)', () => {
    const okResponse = (body: unknown): typeof fetch => (async () => ({
        ok: true,
        status: 200,
        json: async () => body,
    })) as unknown as typeof fetch

    it('unlocks pro for an active license', async () => {
        const fetchImpl = okResponse({
            valid: true,
            license_key: { status: 'active' },
            meta: { customer_email: 'a@b.com' },
        })
        const status = await validateWithLemonSqueezy('REAL-KEY', { fetchImpl })
        expect(status.valid).toBe(true)
        expect(status.tier).toBe('pro')
        expect(status.payload?.sub).toBe('a@b.com')
    })

    it('fails closed for an inactive/invalid license', async () => {
        const fetchImpl = okResponse({ valid: false, license_key: { status: 'expired' } })
        const status = await validateWithLemonSqueezy('BAD-KEY', { fetchImpl })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('inactive')
    })

    it('fails closed on a non-2xx response', async () => {
        const fetchImpl = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch
        const status = await validateWithLemonSqueezy('KEY', { fetchImpl })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('http-404')
    })

    it('fails closed on a network error', async () => {
        const fetchImpl = (async () => { throw new Error('network down') }) as unknown as typeof fetch
        const status = await validateWithLemonSqueezy('KEY', { fetchImpl })
        expect(status.valid).toBe(false)
        expect(status.reason).toBe('network-error')
    })

    it('fails closed for an empty key without calling the network', async () => {
        let called = false
        const fetchImpl = (async () => { called = true; return { ok: true, status: 200, json: async () => ({}) } }) as unknown as typeof fetch
        const status = await validateWithLemonSqueezy('', { fetchImpl })
        expect(status.valid).toBe(false)
        expect(called).toBe(false)
    })
})

describe('verifyLicense (orchestration)', () => {
    it('fails closed for empty/nullish keys', async () => {
        expect((await verifyLicense('')).valid).toBe(false)
        expect((await verifyLicense(null)).valid).toBe(false)
        expect((await verifyLicense(undefined)).valid).toBe(false)
    })

    it('returns pro from the offline signed-key path without going online', async () => {
        const { privateKey, publicKey } = await makeKeyPair()
        const publicKeyJwk = await subtle.exportKey('jwk', publicKey)
        const key = await signLicense({ tier: 'pro' }, privateKey)

        let online = false
        const fetchImpl = (async () => { online = true; return { ok: true, status: 200, json: async () => ({}) } }) as unknown as typeof fetch
        const status = await verifyLicense(key, { publicKeyJwk, now: NOW_MS, online: true, fetchImpl })
        expect(status.valid).toBe(true)
        expect(online).toBe(false)
    })

    it('falls back to online validation when the offline check fails', async () => {
        const fetchImpl = (async () => ({
            ok: true,
            status: 200,
            json: async () => ({ valid: true, license_key: { status: 'active' } }),
        })) as unknown as typeof fetch
        const status = await verifyLicense('LEMON-KEY', { online: true, fetchImpl })
        expect(status.valid).toBe(true)
        expect(status.tier).toBe('pro')
    })

    it('stays on free tier when offline fails and online is disabled', async () => {
        const status = await verifyLicense('LEMON-KEY', { online: false })
        expect(status.valid).toBe(false)
    })
})

describe('license checkout helpers', () => {
    it('reads a license key from return query params', () => {
        const license = getLicenseFromUrl('https://chatgpt.com/?ce_license_key=  license-123  ')

        expect(license).toBe('license-123')
    })

    it('reads a license key from hash params', () => {
        const license = getLicenseFromUrl('https://chatgpt.com/#/return?license_key=license-456')

        expect(license).toBe('license-456')
    })

    it('cleans checkout return params after capture', () => {
        const cleanUrl = cleanLicenseReturnUrl('https://chatgpt.com/?ce_license_key=license-123&ce_checkout_return=1&model=gpt-4#license_key=license-456&view=done')
        const url = new URL(cleanUrl)

        expect(url.searchParams.get('model')).toBe('gpt-4')
        expect(url.searchParams.has('ce_license_key')).toBe(false)
        expect(url.searchParams.has('ce_checkout_return')).toBe(false)
        expect(url.hash).toBe('#view=done')
    })

    it('persists a returned license key and scrubs the source URL', () => {
        const captured: string[] = []
        let scrubbed = false
        const license = captureLicenseFromUrl(
            value => captured.push(value),
            'https://chatgpt.com/?ce_license_key=license-123&ce_checkout_return=1',
            () => { scrubbed = true },
        )

        expect(license).toBe('license-123')
        expect(captured).toEqual(['license-123'])
        expect(scrubbed).toBe(true)
    })

    it('does not persist or scrub when a return URL has no license key', () => {
        const captured: string[] = []
        let scrubbed = false
        const license = captureLicenseFromUrl(
            value => captured.push(value),
            'https://chatgpt.com/?ce_checkout_return=1',
            () => { scrubbed = true },
        )

        expect(license).toBeNull()
        expect(captured).toEqual([])
        expect(scrubbed).toBe(false)
    })

    it('does nothing without an input URL outside the browser', () => {
        const captured: string[] = []
        const license = captureLicenseFromUrl(value => captured.push(value))

        expect(license).toBeNull()
        expect(captured).toEqual([])
    })

    it('adds non-secret return metadata to the hosted checkout URL', () => {
        const checkoutUrl = buildProCheckoutUrl(
            'https://example.lemonsqueezy.com/buy/pro',
            'https://chatgpt.com/?ce_license_key=license-123',
        )
        const url = new URL(checkoutUrl ?? '')
        const returnUrl = new URL(url.searchParams.get('checkout[custom][return_url]') ?? '')

        expect(url.searchParams.get('checkout[custom][source]')).toBe('chatgpt-exporter')
        expect(returnUrl.origin).toBe('https://chatgpt.com')
        expect(returnUrl.searchParams.get('ce_checkout_return')).toBe('1')
        expect(returnUrl.searchParams.has('ce_license_key')).toBe(false)
    })

    it('rejects non-http checkout URLs', () => {
        expect(buildProCheckoutUrl('javascript:alert(1)', 'https://chatgpt.com/')).toBeNull()
    })

    it('builds a clean checkout return URL', () => {
        const returnUrl = new URL(buildCheckoutReturnUrl('https://chatgpt.com/?license=license-123&model=gpt-4'))

        expect(returnUrl.searchParams.get('model')).toBe('gpt-4')
        expect(returnUrl.searchParams.get('ce_checkout_return')).toBe('1')
        expect(returnUrl.searchParams.has('license')).toBe(false)
    })

    it('masks stored license keys', () => {
        expect(maskLicense('12345678-abcdef')).toBe('****-cdef')
    })
})
