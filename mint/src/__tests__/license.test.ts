import { describe, expect, it } from 'vitest'
import { mintProLicense, signLicense } from '../license'
import { generateMintKeypair, importSigningKey, publicJwkFromPrivate } from '../keys'
import { verifyLikeProduct } from './verify-helper'

const NOW_MS = 1_700_000_000_000

async function signer() {
    const keypair = await generateMintKeypair()
    return { keypair, key: await importSigningKey(keypair.privateJwk) }
}

describe('signLicense / mintProLicense', () => {
    it('mints a pro licence the product verifier accepts', async () => {
        const { keypair, key } = await signer()
        const license = await mintProLicense({ sub: 'buyer@example.com' }, key)

        const result = await verifyLikeProduct(license, keypair.publicJwk, NOW_MS)
        expect(result.valid).toBe(true)
        expect(result.tier).toBe('pro')
        expect(result.payload?.sub).toBe('buyer@example.com')
        // perpetual by default — no expiry
        expect(result.payload?.exp).toBeUndefined()
    })

    it('produces the two-part base64url token shape', async () => {
        const { key } = await signer()
        const license = await signLicense({ tier: 'pro' }, key)
        expect(license.split('.')).toHaveLength(2)
        expect(license).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    })

    it('honours a ttl by stamping an expiry', async () => {
        const { keypair, key } = await signer()
        const license = await mintProLicense({ ttlDays: 30, now: NOW_MS }, key)

        const result = await verifyLikeProduct(license, keypair.publicJwk, NOW_MS)
        expect(result.valid).toBe(true)
        expect(result.payload?.exp).toBe(Math.floor(NOW_MS / 1000) + 30 * 86_400)
    })

    it('an expired licence fails the product verifier', async () => {
        const { keypair, key } = await signer()
        const license = await mintProLicense({ ttlDays: 1, now: NOW_MS }, key)

        // verify a year later
        const result = await verifyLikeProduct(license, keypair.publicJwk, NOW_MS + 366 * 86_400_000)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('expired')
    })

    it('a licence from a different key is rejected', async () => {
        const { key } = await signer()
        const attacker = await generateMintKeypair()
        const license = await mintProLicense({ sub: 'x' }, key)

        const result = await verifyLikeProduct(license, attacker.publicJwk, NOW_MS)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('bad-signature')
    })

    it('carries explicit feature grants', async () => {
        const { keypair, key } = await signer()
        const license = await mintProLicense({ features: ['bulk-export'] }, key)

        const result = await verifyLikeProduct(license, keypair.publicJwk, NOW_MS)
        expect(result.payload?.features).toEqual(['bulk-export'])
    })

    it('publicJwkFromPrivate drops the private component', async () => {
        const keypair = await generateMintKeypair()
        const pub = publicJwkFromPrivate(keypair.privateJwk)
        expect(pub.d).toBeUndefined()
        expect(pub.x).toBe(keypair.publicJwk.x)
        expect(pub.y).toBe(keypair.publicJwk.y)
    })
})
