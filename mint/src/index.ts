/**
 * Mint entrypoint. Boots an HTTP server from environment config. The signing key
 * is always resolved (auto-generated + persisted on first run) so `/pubkey`
 * serves the verify key even before a receive address is set; checkouts stay
 * gated on `isConfigured` until `MINT_BTC_ADDRESS` is provided.
 */

import { isConfigured, loadConfigFromEnv } from './config'
import { importSigningKey, loadOrCreateKeypair, publicJwkFromPrivate } from './keys'
import { MintService } from './service'
import { startServer } from './server'

async function main(): Promise<void> {
    const config = loadConfigFromEnv()

    const keypair = config.privateJwk
        ? { privateJwk: config.privateJwk, publicJwk: publicJwkFromPrivate(config.privateJwk) }
        : await loadOrCreateKeypair(config.keyFile ?? '.data/mint.key.json')

    const signingKey = await importSigningKey(keypair.privateJwk)
    const service = new MintService({ config, signingKey })

    startServer({ service, publicJwk: keypair.publicJwk }, config.port)
    // eslint-disable-next-line no-console
    console.log(`[mint] listening on :${config.port} — configured=${isConfigured(config)} address=${config.address || '(unset)'} price=$${config.priceUsd}`)
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[mint] failed to start:', err)
    process.exitCode = 1
})
