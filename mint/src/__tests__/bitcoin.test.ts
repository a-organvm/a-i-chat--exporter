import { describe, expect, it } from 'vitest'
import { checkAddressPayment, fetchBtcUsd, priceToSats, satsToBtcString } from '../bitcoin'

const ADDR = 'bc1qexampleaddress'

/** Minimal Esplora-shaped fetch stub keyed by URL substring. */
function mockFetch(routes: Array<{ match: string, json?: unknown, text?: string, ok?: boolean, status?: number }>): typeof fetch {
    return (async (input: string | URL) => {
        const url = String(input)
        const route = routes.find(r => url.includes(r.match))
        if (!route) return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
        return {
            ok: route.ok ?? true,
            status: route.status ?? 200,
            json: async () => route.json ?? {},
            text: async () => route.text ?? '',
        }
    }) as unknown as typeof fetch
}

function confirmedTx(txid: string, sats: number, address = ADDR, blockHeight = 800_000) {
    return { txid, status: { confirmed: true, block_height: blockHeight }, vout: [{ scriptpubkey_address: address, value: sats }] }
}

describe('priceToSats / satsToBtcString', () => {
    it('converts USD to whole sats, rounding up', () => {
        expect(priceToSats(9, 60_000)).toBe(15_000)
        expect(priceToSats(9, 90_000)).toBe(10_000)
    })

    it('returns 0 for non-positive inputs', () => {
        expect(priceToSats(9, 0)).toBe(0)
        expect(priceToSats(0, 60_000)).toBe(0)
    })

    it('renders sats as an 8-dp BTC string', () => {
        expect(satsToBtcString(15_000)).toBe('0.00015000')
        expect(satsToBtcString(100_000_000)).toBe('1.00000000')
    })
})

describe('fetchBtcUsd', () => {
    it('reads USD from the explorer price oracle', async () => {
        const fetchImpl = mockFetch([{ match: '/api/v1/prices', json: { USD: 65_000, EUR: 60_000 } }])
        expect(await fetchBtcUsd('https://mempool.space', fetchImpl)).toBe(65_000)
    })

    it('throws on a bad oracle response', async () => {
        const fetchImpl = mockFetch([{ match: '/api/v1/prices', json: { USD: 0 } }])
        await expect(fetchBtcUsd('https://mempool.space', fetchImpl)).rejects.toThrow()
    })
})

describe('checkAddressPayment', () => {
    it('confirms a sufficient confirmed payment', async () => {
        const fetchImpl = mockFetch([{ match: `/address/${ADDR}/txs`, json: [confirmedTx('t1', 15_000)] }])
        const result = await checkAddressPayment({ address: ADDR, minSats: 15_000, fetchImpl })
        expect(result.paid).toBe(true)
        expect(result.matchedSats).toBe(15_000)
        expect(result.matchedTxid).toBe('t1')
    })

    it('rejects an underpayment', async () => {
        const fetchImpl = mockFetch([{ match: `/address/${ADDR}/txs`, json: [confirmedTx('t1', 14_999)] }])
        const result = await checkAddressPayment({ address: ADDR, minSats: 15_000, fetchImpl })
        expect(result.paid).toBe(false)
    })

    it('ignores an unconfirmed tx', async () => {
        const tx = { txid: 't1', status: { confirmed: false }, vout: [{ scriptpubkey_address: ADDR, value: 20_000 }] }
        const fetchImpl = mockFetch([{ match: `/address/${ADDR}/txs`, json: [tx] }])
        const result = await checkAddressPayment({ address: ADDR, minSats: 15_000, fetchImpl })
        expect(result.paid).toBe(false)
    })

    it('ignores outputs to a different address', async () => {
        const fetchImpl = mockFetch([{ match: `/address/${ADDR}/txs`, json: [confirmedTx('t1', 20_000, 'bc1qsomeoneelse')] }])
        const result = await checkAddressPayment({ address: ADDR, minSats: 15_000, fetchImpl })
        expect(result.paid).toBe(false)
    })

    it('enforces minConfirmations using the chain tip', async () => {
        const tx = confirmedTx('t1', 15_000, ADDR, 800_000)
        const enough = mockFetch([
            { match: `/address/${ADDR}/txs`, json: [tx] },
            { match: '/blocks/tip/height', text: '800002' }, // 3 confirmations
        ])
        const notEnough = mockFetch([
            { match: `/address/${ADDR}/txs`, json: [tx] },
            { match: '/blocks/tip/height', text: '800001' }, // 2 confirmations
        ])
        expect((await checkAddressPayment({ address: ADDR, minSats: 15_000, minConfirmations: 3, fetchImpl: enough })).paid).toBe(true)
        expect((await checkAddressPayment({ address: ADDR, minSats: 15_000, minConfirmations: 3, fetchImpl: notEnough })).paid).toBe(false)
    })

    it('fails closed on a network error', async () => {
        const fetchImpl = (async () => { throw new Error('offline') }) as unknown as typeof fetch
        const result = await checkAddressPayment({ address: ADDR, minSats: 15_000, fetchImpl })
        expect(result.paid).toBe(false)
        expect(result.matchedTxid).toBeNull()
    })
})
