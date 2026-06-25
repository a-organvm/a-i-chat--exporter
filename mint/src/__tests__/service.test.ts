import { describe, expect, it } from 'vitest'
import { MintService } from '../service'
import { loadConfigFromEnv, type MintConfig } from '../config'
import { generateMintKeypair, importSigningKey, type MintKeypair } from '../keys'
import { verifyLikeProduct } from './verify-helper'

const ADDR = 'bc1qmintaddress'
const NOW = 1_700_000_000_000

function mockFetch(routes: Array<{ match: string, json?: unknown, text?: string, ok?: boolean, status?: number }>): typeof fetch {
    return (async (input: string | URL) => {
        const url = String(input)
        const route = routes.find(r => url.includes(r.match))
        if (!route) return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
        return { ok: route.ok ?? true, status: route.status ?? 200, json: async () => route.json ?? {}, text: async () => route.text ?? '' }
    }) as unknown as typeof fetch
}

const throwingFetch = (async () => { throw new Error('should-not-be-called') }) as unknown as typeof fetch

function confirmedTx(sats: number) {
    return { txid: 'paytx', status: { confirmed: true, block_height: 800_000 }, vout: [{ scriptpubkey_address: ADDR, value: sats }] }
}

async function makeService(env: Record<string, string>, fetchImpl: typeof fetch, genId: () => string = () => 'order-1') {
    const keypair: MintKeypair = await generateMintKeypair()
    const config: MintConfig = loadConfigFromEnv({ MINT_PRIVATE_JWK: JSON.stringify(keypair.privateJwk), ...env })
    const signingKey = await importSigningKey(keypair.privateJwk)
    const service = new MintService({ config, signingKey, fetchImpl, now: () => NOW, genId })
    return { service, keypair, config }
}

describe('MintService.checkout', () => {
    it('refuses checkout until a receive address is configured', async () => {
        const { service } = await makeService({ MINT_BTC_USD: '60000' }, throwingFetch) // no MINT_BTC_ADDRESS
        const res = await service.checkout({ email: 'a@b.com' })
        expect(res.statusCode).toBe(503)
        expect(res.body.error).toBe('unconfigured')
    })

    it('quotes a unique sat amount with a BIP21 pay URI', async () => {
        const { service } = await makeService({ MINT_BTC_ADDRESS: ADDR, MINT_PRICE_USD: '9', MINT_BTC_USD: '60000' }, throwingFetch)
        const res = await service.checkout({ email: 'a@b.com' })
        expect(res.statusCode).toBe(201)
        expect(res.body.status).toBe('pending')
        expect(res.body.sats).toBe(15_000) // 9 / 60000 BTC
        expect(res.body.payUri).toBe(`bitcoin:${ADDR}?amount=0.00015000`)
        expect(res.body.license).toBeUndefined()
    })

    it('reports price-unavailable when the oracle is down and no override is set', async () => {
        const fetchImpl = mockFetch([{ match: '/api/v1/prices', ok: false, status: 502 }])
        const { service } = await makeService({ MINT_BTC_ADDRESS: ADDR }, fetchImpl) // no MINT_BTC_USD -> oracle
        const res = await service.checkout({ email: 'a@b.com' })
        expect(res.statusCode).toBe(503)
        expect(res.body.error).toBe('price-unavailable')
    })
})

describe('MintService.order (the full sovereign flow)', () => {
    it('mints a product-valid licence once the chain shows payment', async () => {
        // checkout first (override price, no fetch), then point fetch at a paying tx
        const paid = mockFetch([{ match: `/address/${ADDR}/txs`, json: [confirmedTx(15_000)] }])
        const { service, keypair } = await makeService(
            { MINT_BTC_ADDRESS: ADDR, MINT_PRICE_USD: '9', MINT_BTC_USD: '60000' },
            paid,
        )

        const checkout = await service.checkout({ email: 'buyer@example.com' })
        expect(checkout.body.sats).toBe(15_000)

        const order = await service.order('order-1')
        expect(order.statusCode).toBe(200)
        expect(order.body.status).toBe('paid')
        expect(order.body.txid).toBe('paytx')

        const license = order.body.license as string
        const verified = await verifyLikeProduct(license, keypair.publicJwk, NOW)
        expect(verified.valid).toBe(true)
        expect(verified.tier).toBe('pro')
        expect(verified.payload?.sub).toBe('buyer@example.com')
    })

    it('stays pending while no payment has landed', async () => {
        const none = mockFetch([{ match: `/address/${ADDR}/txs`, json: [] }])
        const { service } = await makeService({ MINT_BTC_ADDRESS: ADDR, MINT_BTC_USD: '60000' }, none)
        await service.checkout({})
        const order = await service.order('order-1')
        expect(order.body.status).toBe('pending')
        expect(order.body.license).toBeUndefined()
    })

    it('404s an unknown order', async () => {
        const { service } = await makeService({ MINT_BTC_ADDRESS: ADDR, MINT_BTC_USD: '60000' }, throwingFetch)
        const res = await service.order('does-not-exist')
        expect(res.statusCode).toBe(404)
    })
})
