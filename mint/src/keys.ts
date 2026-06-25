/**
 * Mint signing-key lifecycle. The mint owns an ECDSA P-256 keypair: the private
 * half signs licences, the public half is embedded in the userscript so it can
 * verify them offline. This is a code/licence signing key the project holds —
 * like a release-signing key — never a user credential.
 *
 * Keys are auto-generated and persisted on first boot (a gitignored keyfile), so
 * standing up the mint needs no key handed around. `keygen.ts` prints the public
 * JWK to embed in the product build.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const subtle = globalThis.crypto.subtle

export interface MintKeypair {
    publicJwk: JsonWebKey
    privateJwk: JsonWebKey
}

export async function generateMintKeypair(): Promise<MintKeypair> {
    const pair = await subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify'],
    ) as CryptoKeyPair
    return {
        publicJwk: await subtle.exportKey('jwk', pair.publicKey),
        privateJwk: await subtle.exportKey('jwk', pair.privateKey),
    }
}

/** Import a private JWK as an ECDSA signing key. */
export async function importSigningKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** Derive the public JWK (drops the private `d` component) from a private JWK. */
export function publicJwkFromPrivate(privateJwk: JsonWebKey): JsonWebKey {
    const { d: _d, ...rest } = privateJwk
    return { ...rest, key_ops: ['verify'] }
}

/**
 * Load the private JWK from a keyfile, generating + persisting a fresh keypair
 * the first time. Returns the full keypair so callers can publish the public half.
 */
export async function loadOrCreateKeypair(keyFile: string): Promise<MintKeypair> {
    if (existsSync(keyFile)) {
        const privateJwk = JSON.parse(readFileSync(keyFile, 'utf8')) as JsonWebKey
        return { privateJwk, publicJwk: publicJwkFromPrivate(privateJwk) }
    }
    const keypair = await generateMintKeypair()
    mkdirSync(dirname(keyFile), { recursive: true })
    writeFileSync(keyFile, JSON.stringify(keypair.privateJwk), { mode: 0o600 })
    return keypair
}
