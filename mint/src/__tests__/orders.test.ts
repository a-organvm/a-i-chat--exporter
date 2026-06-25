import { describe, expect, it } from 'vitest'
import { OrderStore } from '../orders'

const ADDR = 'bc1qexample'
const TTL = 60_000

describe('OrderStore', () => {
    it('creates a pending order at the given address', () => {
        const store = new OrderStore()
        const order = store.create({ id: 'o1', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        expect(order.status).toBe('pending')
        expect(order.address).toBe(ADDR)
        expect(order.sats).toBe(15_000)
        expect(order.expiresAt).toBe(1_000 + TTL)
    })

    it('bumps the amount so concurrent orders stay unique', () => {
        const store = new OrderStore()
        const a = store.create({ id: 'o1', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        const b = store.create({ id: 'o2', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        const c = store.create({ id: 'o3', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        expect(new Set([a.sats, b.sats, c.sats]).size).toBe(3)
        expect([a.sats, b.sats, c.sats].sort()).toEqual([15_000, 15_001, 15_002])
    })

    it('reuses an amount once an old order has expired', () => {
        const store = new OrderStore()
        store.create({ id: 'o1', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        // second order created after the first expired -> amount is free again
        const b = store.create({ id: 'o2', address: ADDR, baseSats: 15_000, now: 1_000 + TTL + 1, ttlMs: TTL })
        expect(b.sats).toBe(15_000)
    })

    it('marks a pending order expired once its window passes', () => {
        const store = new OrderStore()
        store.create({ id: 'o1', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        expect(store.get('o1', 1_500)?.status).toBe('pending')
        expect(store.get('o1', 1_000 + TTL)?.status).toBe('expired')
    })

    it('records the licence + txid when marked paid', () => {
        const store = new OrderStore()
        store.create({ id: 'o1', address: ADDR, baseSats: 15_000, now: 1_000, ttlMs: TTL })
        const paid = store.markPaid('o1', { license: 'payload.sig', txid: 'tx-abc' })
        expect(paid?.status).toBe('paid')
        expect(paid?.license).toBe('payload.sig')
        expect(paid?.txid).toBe('tx-abc')
    })

    it('returns undefined for unknown ids', () => {
        const store = new OrderStore()
        expect(store.get('nope')).toBeUndefined()
        expect(store.markPaid('nope', { license: 'x', txid: null })).toBeUndefined()
    })
})
