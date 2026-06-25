/**
 * Thin `node:http` transport over {@link MintService}. Routes:
 *   GET  /health        liveness + whether the mint is configured to sell
 *   GET  /pubkey        the ECDSA public JWK to embed in the product build
 *   POST /checkout      { email? } -> order with a BIP21 pay URI
 *   GET  /order/:id     poll; mints + returns the licence once paid
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import type { HttpResult, MintService } from './service'

export interface ServerOptions {
    service: MintService
    publicJwk: JsonWebKey | null
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    if (chunks.length === 0) return {}
    try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    }
    catch {
        return {}
    }
}

function send(res: ServerResponse, result: HttpResult): void {
    res.statusCode = result.statusCode
    res.end(JSON.stringify(result.body))
}

export function createRequestListener(opts: ServerOptions) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        res.setHeader('content-type', 'application/json')
        res.setHeader('access-control-allow-origin', '*')
        res.setHeader('access-control-allow-headers', 'content-type')
        res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')

        if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
        }

        try {
            const url = new URL(req.url ?? '/', 'http://localhost')

            if (url.pathname === '/health' && req.method === 'GET') {
                send(res, opts.service.health())
                return
            }
            if (url.pathname === '/pubkey' && req.method === 'GET') {
                send(res, opts.publicJwk
                    ? { statusCode: 200, body: { jwk: opts.publicJwk } }
                    : { statusCode: 503, body: { error: 'no-key' } })
                return
            }
            if (url.pathname === '/checkout' && req.method === 'POST') {
                const body = await readJsonBody(req)
                const email = typeof body.email === 'string' ? body.email : undefined
                send(res, await opts.service.checkout({ email }))
                return
            }
            const orderMatch = url.pathname.match(/^\/order\/(.+)$/)
            if (orderMatch && req.method === 'GET') {
                send(res, await opts.service.order(decodeURIComponent(orderMatch[1])))
                return
            }

            send(res, { statusCode: 404, body: { error: 'not-found' } })
        }
        catch {
            send(res, { statusCode: 500, body: { error: 'internal' } })
        }
    }
}

export function startServer(opts: ServerOptions, port: number): Server {
    const server = createServer(createRequestListener(opts))
    server.listen(port)
    return server
}
