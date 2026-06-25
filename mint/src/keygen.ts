/**
 * Print the mint's PUBLIC JWK — the verify key to embed in the product build as
 * `VITE_EXPORTER_PUBLIC_JWK` (see src/utils/license.ts). Generates + persists the
 * keypair on first run; the private half never leaves the keyfile.
 *
 *   cd mint && npm run keygen
 */

import { loadConfigFromEnv } from './config'
import { loadOrCreateKeypair, publicJwkFromPrivate } from './keys'

async function main(): Promise<void> {
    const config = loadConfigFromEnv()
    const publicJwk = config.privateJwk
        ? publicJwkFromPrivate(config.privateJwk)
        : (await loadOrCreateKeypair(config.keyFile ?? '.data/mint.key.json')).publicJwk
    process.stdout.write(`${JSON.stringify(publicJwk)}\n`)
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[mint] keygen failed:', err)
    process.exitCode = 1
})
