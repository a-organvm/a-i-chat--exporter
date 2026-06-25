/**
 * The mint's request logic, transport-free so it can be unit-tested without
 * binding a socket. `MintService` owns the order book + signing key and turns
 * two calls — `checkout` and `order` — into the whole sovereign flow:
 *
 *   checkout → quote a unique sat amount at our address (a BIP21 pay URI)
 *   order    → ask the chain if it landed; if so, mint + return the licence
 *
 * Every dependency that touches the clock, randomness, or the network is
 * injectable, so the logic is deterministic under test.
 */

import { checkAddressPayment, fetchBtcUsd, priceToSats, satsToBtcString } from './bitcoin'
import { mintProLicense } from './license'
import { importSigningKey, loadOrCreateKeypair } from './keys'
import { OrderStore, type Order } from './orders'
import { isConfigured, type MintConfig } from './config'

export interface HttpResult {
    statusCode: number
    body: Record<string, unknown>
}

export interface MintServiceDeps {
    config: MintConfig
    signingKey: CryptoKey
    store?: OrderStore
    now?: () => number
    genId?: () => string
    fetchImpl?: typeof fetch
}

export class MintService {
    readonly config: MintConfig
    private readonly store: OrderStore
    private readonly signingKey: CryptoKey
    private readonly now: () => number
    private readonly genId: () => string
    private readonly fetchImpl: typeof fetch

    constructor(deps: MintServiceDeps) {
        this.config = deps.config
        this.store = deps.store ?? new OrderStore()
        this.signingKey = deps.signingKey
        this.now = deps.now ?? (() => Date.now())
        this.genId = deps.genId ?? (() => globalThis.crypto.randomUUID())
        this.fetchImpl = deps.fetchImpl ?? fetch
    }

    health(): HttpResult {
        return { statusCode: 200, body: { ok: true, configured: isConfigured(this.config) } }
    }

    async checkout(input: { email?: string } = {}): Promise<HttpResult> {
        if (!isConfigured(this.config)) {
            return { statusCode: 503, body: { error: 'unconfigured' } }
        }

        let btcUsd = this.config.btcUsdOverride
        if (btcUsd === null) {
            try {
                btcUsd = await fetchBtcUsd(this.config.explorerBase, this.fetchImpl)
            }
            catch {
                return { statusCode: 503, body: { error: 'price-unavailable' } }
            }
        }

        const baseSats = priceToSats(this.config.priceUsd, btcUsd)
        if (baseSats <= 0) return { statusCode: 503, body: { error: 'price-unavailable' } }

        const order = this.store.create({
            id: this.genId(),
            email: input.email,
            address: this.config.address,
            baseSats,
            now: this.now(),
            ttlMs: this.config.orderTtlMs,
        })
        return { statusCode: 201, body: this.describe(order) }
    }

    async order(id: string): Promise<HttpResult> {
        const now = this.now()
        let order = this.store.get(id, now)
        if (!order) return { statusCode: 404, body: { error: 'not-found' } }

        if (order.status === 'pending') {
            const payment = await checkAddressPayment({
                address: order.address,
                minSats: order.sats,
                explorerBase: this.config.explorerBase,
                minConfirmations: this.config.minConfirmations,
                fetchImpl: this.fetchImpl,
            })
            if (payment.paid) {
                const license = await mintProLicense(
                    { sub: order.email, ttlDays: this.config.licenseTtlDays, now },
                    this.signingKey,
                )
                this.store.markPaid(order.id, { license, txid: payment.matchedTxid })
                order = this.store.get(id, now) ?? order
            }
        }

        return { statusCode: 200, body: this.describe(order) }
    }

    private describe(order: Order): Record<string, unknown> {
        const amountBtc = satsToBtcString(order.sats)
        const body: Record<string, unknown> = {
            orderId: order.id,
            status: order.status,
            address: order.address,
            sats: order.sats,
            amountBtc,
            expiresAt: order.expiresAt,
        }
        if (order.status === 'pending') {
            body.payUri = `bitcoin:${order.address}?amount=${amountBtc}`
        }
        if (order.status === 'paid' && order.license) {
            body.license = order.license
            if (order.txid) body.txid = order.txid
            if (this.config.returnUrlBase) {
                const sep = this.config.returnUrlBase.includes('?') ? '&' : '?'
                body.returnUrl = `${this.config.returnUrlBase}${sep}ce_license_key=${encodeURIComponent(order.license)}`
            }
        }
        return body
    }
}

/** Resolve the signing key from config (inline JWK, else the persisted keyfile). */
export async function resolveSigningKey(config: MintConfig): Promise<CryptoKey> {
    if (config.privateJwk) return importSigningKey(config.privateJwk)
    if (config.keyFile) {
        const keypair = await loadOrCreateKeypair(config.keyFile)
        return importSigningKey(keypair.privateJwk)
    }
    throw new Error('no signing key configured')
}
