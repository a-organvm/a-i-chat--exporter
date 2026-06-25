/**
 * Environment-driven configuration. Every value is optional: with nothing set
 * the mint boots and reports `configured:false`, refusing checkouts exactly like
 * the product's empty-checkout-URL gate. The code is done regardless of config;
 * these values are the operate step.
 */

export interface MintConfig {
    port: number
    priceUsd: number
    btcUsdOverride: number | null
    address: string
    explorerBase: string
    minConfirmations: number
    licenseTtlDays: number
    orderTtlMs: number
    returnUrlBase: string | null
    privateJwk: JsonWebKey | null
    keyFile: string | null
}

type Env = Record<string, string | undefined>

function num(value: string | undefined, fallback: number): number {
    if (value === undefined || value.trim() === '') return fallback
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export function loadConfigFromEnv(env: Env = process.env): MintConfig {
    let privateJwk: JsonWebKey | null = null
    const rawJwk = env.MINT_PRIVATE_JWK?.trim()
    if (rawJwk) {
        try {
            privateJwk = JSON.parse(rawJwk) as JsonWebKey
        }
        catch {
            privateJwk = null
        }
    }

    return {
        port: num(env.PORT, 8787),
        priceUsd: num(env.MINT_PRICE_USD, 9),
        btcUsdOverride: env.MINT_BTC_USD?.trim() ? num(env.MINT_BTC_USD, 0) || null : null,
        address: env.MINT_BTC_ADDRESS?.trim() ?? '',
        explorerBase: env.MINT_EXPLORER_BASE?.trim() || 'https://mempool.space',
        minConfirmations: Math.max(1, num(env.MINT_MIN_CONFIRMATIONS, 1)),
        licenseTtlDays: Math.max(0, num(env.MINT_LICENSE_TTL_DAYS, 0)),
        orderTtlMs: Math.max(1, num(env.MINT_ORDER_TTL_MINUTES, 60)) * 60_000,
        returnUrlBase: env.MINT_RETURN_URL_BASE?.trim() || null,
        privateJwk,
        keyFile: privateJwk ? null : (env.MINT_KEY_FILE?.trim() || '.data/mint.key.json'),
    }
}

/** A mint can mint + sell only with both a receive address and a signing key. */
export function isConfigured(config: MintConfig): boolean {
    return Boolean(config.address) && Boolean(config.privateJwk || config.keyFile)
}
