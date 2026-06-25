/**
 * Keyless Bitcoin payment verification against a public Esplora block explorer
 * (mempool.space by default, or your own self-hosted mempool/Electrs instance).
 *
 * Strictly read-only: the mint never holds keys to, signs for, or moves funds —
 * it only asks the chain "did `minSats` land at this address?". No account, no
 * API key, no processor. `fetchImpl` is injectable so the logic is fully testable
 * against fixtures.
 */

export const SATS_PER_BTC = 100_000_000

interface EsploraVout {
    scriptpubkey_address?: string
    value: number
}

interface EsploraTxStatus {
    confirmed: boolean
    block_height?: number
}

interface EsploraTx {
    txid: string
    status: EsploraTxStatus
    vout: EsploraVout[]
}

export interface AddressPayment {
    /** A single tx delivered at least `minSats` with enough confirmations. */
    paid: boolean
    /** Sats delivered to the address by the matching tx (0 when unpaid). */
    matchedSats: number
    matchedTxid: string | null
    confirmations: number
}

export interface CheckAddressPaymentOptions {
    address: string
    minSats: number
    explorerBase?: string
    minConfirmations?: number
    fetchImpl?: typeof fetch
}

function normalizeBase(base: string): string {
    return base.replace(/\/+$/, '')
}

/** Convert a USD amount to whole sats at the given BTC/USD rate (rounds up). */
export function priceToSats(usd: number, btcUsd: number): number {
    if (!(btcUsd > 0) || !(usd > 0)) return 0
    return Math.ceil((usd / btcUsd) * SATS_PER_BTC)
}

export function satsToBtcString(sats: number): string {
    return (sats / SATS_PER_BTC).toFixed(8)
}

/** Read BTC/USD from the explorer's keyless price oracle. */
export async function fetchBtcUsd(explorerBase: string, fetchImpl: typeof fetch = fetch): Promise<number> {
    const res = await fetchImpl(`${normalizeBase(explorerBase)}/api/v1/prices`)
    if (!res.ok) throw new Error(`price-oracle-http-${res.status}`)
    const data = await res.json() as { USD?: number }
    if (typeof data?.USD !== 'number' || !(data.USD > 0)) throw new Error('price-oracle-bad-response')
    return data.USD
}

/**
 * Check whether a confirmed payment of at least `minSats` has landed at the
 * address. Returns the matching tx so the caller can record it on the order.
 * Fails closed (paid:false) on any network/parse error.
 */
export async function checkAddressPayment(opts: CheckAddressPaymentOptions): Promise<AddressPayment> {
    const fetchImpl = opts.fetchImpl ?? fetch
    const base = normalizeBase(opts.explorerBase ?? 'https://mempool.space')
    const minConfirmations = Math.max(1, opts.minConfirmations ?? 1)
    const unpaid: AddressPayment = { paid: false, matchedSats: 0, matchedTxid: null, confirmations: 0 }

    try {
        const txsRes = await fetchImpl(`${base}/api/address/${encodeURIComponent(opts.address)}/txs`)
        if (!txsRes.ok) return unpaid
        const txs = await txsRes.json() as EsploraTx[]
        if (!Array.isArray(txs)) return unpaid

        // Confirmations need the chain tip — only fetched when more than 1 is required.
        let tipHeight: number | null = null
        if (minConfirmations > 1) {
            const tipRes = await fetchImpl(`${base}/api/blocks/tip/height`)
            if (tipRes.ok) {
                const parsed = Number(await tipRes.text())
                if (Number.isFinite(parsed)) tipHeight = parsed
            }
        }

        let best: AddressPayment = unpaid
        for (const tx of txs) {
            if (!tx.status?.confirmed) continue
            const satsToAddress = (tx.vout ?? [])
                .filter(v => v.scriptpubkey_address === opts.address)
                .reduce((sum, v) => sum + (v.value || 0), 0)
            if (satsToAddress < opts.minSats) continue

            const confirmations = tipHeight !== null && typeof tx.status.block_height === 'number'
                ? tipHeight - tx.status.block_height + 1
                : 1
            if (confirmations < minConfirmations) continue

            if (satsToAddress > best.matchedSats) {
                best = { paid: true, matchedSats: satsToAddress, matchedTxid: tx.txid, confirmations }
            }
        }
        return best
    }
    catch {
        return unpaid
    }
}
