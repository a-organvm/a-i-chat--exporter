import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startServer } from '../server'
import { MintService } from '../service'
import { loadConfigFromEnv } from '../config'
import { generateMintKeypair, importSigningKey } from '../keys'

let server: Server
let base: string
let publicJwk: JsonWebKey

beforeAll(async () => {
    const keypair = await generateMintKeypair()
    publicJwk = keypair.publicJwk
    const config = loadConfigFromEnv({ MINT_PRIVATE_JWK: JSON.stringify(keypair.privateJwk) }) // no address -> unconfigured
    const service = new MintService({ config, signingKey: await importSigningKey(keypair.privateJwk) })
    server = startServer({ service, publicJwk: keypair.publicJwk }, 0)
    await new Promise<void>(resolve => server.once('listening', () => resolve()))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
    server.close()
})

describe('mint HTTP server', () => {
    it('GET /health reports liveness + configured flag', async () => {
        const res = await fetch(`${base}/health`)
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true, configured: false })
    })

    it('GET /pubkey serves the verify key for the product build', async () => {
        const res = await fetch(`${base}/pubkey`)
        expect(res.status).toBe(200)
        const body = await res.json() as { jwk: JsonWebKey }
        expect(body.jwk.x).toBe(publicJwk.x)
        expect(body.jwk.d).toBeUndefined()
    })

    it('POST /checkout is refused while unconfigured', async () => {
        const res = await fetch(`${base}/checkout`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'a@b.com' }),
        })
        expect(res.status).toBe(503)
        expect((await res.json()).error).toBe('unconfigured')
    })

    it('unknown routes 404', async () => {
        const res = await fetch(`${base}/nope`)
        expect(res.status).toBe(404)
    })
})
