import { ScriptStorage } from './utils/storage'

export const EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY = 'exporter:auth:api_key_digest'
export const EXPORTER_AUTH_API_KEY_ISSUED_AT_STORAGE_KEY = 'exporter:auth:api_key_issued_at'
export const EXPORTER_AUTH_VERIFIED_DIGEST_SESSION_KEY = 'exporter:auth:verified_digest'

const API_KEY_PREFIX = 'aice_'
const API_KEY_BYTES = 32

let memoryVerifiedDigest: string | null = null

export type ExporterAuthErrorCode = 'api-key-not-configured' | 'api-key-not-verified'

export interface ExporterAuthStatus {
    configured: boolean
    verified: boolean
    issuedAt: string | null
    digestStorageKey: string
    issuedAtStorageKey: string
    verifiedSessionKey: string
}

export interface IssuedApiKey {
    apiKey: string
    issuedAt: string
}

export class ExporterAuthError extends Error {
    code: ExporterAuthErrorCode

    constructor(code: ExporterAuthErrorCode, message: string) {
        super(message)
        this.name = 'ExporterAuthError'
        this.code = code
    }
}

export function isExporterAuthError(error: unknown): error is ExporterAuthError {
    return error instanceof ExporterAuthError
        || (
            typeof error === 'object'
            && error !== null
            && 'name' in error
            && (error as { name: unknown }).name === 'ExporterAuthError'
        )
}

export async function issueApiKey(): Promise<IssuedApiKey> {
    const apiKey = generateApiKey()
    const digest = await digestApiKey(apiKey)
    const issuedAt = new Date().toISOString()

    ScriptStorage.set(EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY, digest)
    ScriptStorage.set(EXPORTER_AUTH_API_KEY_ISSUED_AT_STORAGE_KEY, issuedAt)
    setVerifiedSessionDigest(digest)

    return { apiKey, issuedAt }
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
    const configuredDigest = getConfiguredDigest()
    if (!configuredDigest) return false

    const submittedDigest = await digestApiKey(apiKey)
    return submittedDigest === configuredDigest
}

export async function authorizeApiKey(apiKey: string): Promise<boolean> {
    const configuredDigest = getConfiguredDigest()
    if (!configuredDigest) return false

    const submittedDigest = await digestApiKey(apiKey)
    const verified = submittedDigest === configuredDigest
    if (verified) setVerifiedSessionDigest(configuredDigest)

    return verified
}

export function clearApiKeyAuthorization(): void {
    clearVerifiedSessionDigest()
}

export function revokeApiKey(): void {
    ScriptStorage.delete(EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY)
    ScriptStorage.delete(EXPORTER_AUTH_API_KEY_ISSUED_AT_STORAGE_KEY)
    clearVerifiedSessionDigest()
}

export async function getExporterAuthStatus(): Promise<ExporterAuthStatus> {
    const configuredDigest = getConfiguredDigest()
    const verifiedDigest = getVerifiedSessionDigest()

    return {
        configured: Boolean(configuredDigest),
        verified: Boolean(configuredDigest && verifiedDigest === configuredDigest),
        issuedAt: ScriptStorage.get<string>(EXPORTER_AUTH_API_KEY_ISSUED_AT_STORAGE_KEY),
        digestStorageKey: EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY,
        issuedAtStorageKey: EXPORTER_AUTH_API_KEY_ISSUED_AT_STORAGE_KEY,
        verifiedSessionKey: EXPORTER_AUTH_VERIFIED_DIGEST_SESSION_KEY,
    }
}

export async function requireExporterApiAuth(): Promise<void> {
    const status = await getExporterAuthStatus()

    if (!status.configured) {
        throw new ExporterAuthError(
            'api-key-not-configured',
            'Exporter API key is required. Open Exporter Settings > API Auth to issue and unlock a key.',
        )
    }

    if (!status.verified) {
        throw new ExporterAuthError(
            'api-key-not-verified',
            'Exporter API key is not verified. Open Exporter Settings > API Auth to unlock API access.',
        )
    }
}

function normalizeApiKey(apiKey: string): string {
    return apiKey.trim()
}

function getConfiguredDigest(): string | null {
    return ScriptStorage.get<string>(EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY)
}

function generateApiKey(): string {
    if (!globalThis.crypto?.getRandomValues) {
        throw new Error('Secure random API is unavailable.')
    }

    const bytes = new Uint8Array(API_KEY_BYTES)
    globalThis.crypto.getRandomValues(bytes)
    return `${API_KEY_PREFIX}${base64UrlEncode(bytes)}`
}

async function digestApiKey(apiKey: string): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Web Crypto digest API is unavailable.')
    }

    const encoded = new TextEncoder().encode(normalizeApiKey(apiKey))
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
}

function base64UrlEncode(bytes: Uint8Array): string {
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

function getBrowserSessionStorage(): Storage | null {
    try {
        return typeof sessionStorage === 'undefined' ? null : sessionStorage
    }
    catch {
        return null
    }
}

function getVerifiedSessionDigest(): string | null {
    return getBrowserSessionStorage()?.getItem(EXPORTER_AUTH_VERIFIED_DIGEST_SESSION_KEY)
        ?? memoryVerifiedDigest
}

function setVerifiedSessionDigest(digest: string): void {
    memoryVerifiedDigest = digest
    getBrowserSessionStorage()?.setItem(EXPORTER_AUTH_VERIFIED_DIGEST_SESSION_KEY, digest)
}

function clearVerifiedSessionDigest(): void {
    memoryVerifiedDigest = null
    getBrowserSessionStorage()?.removeItem(EXPORTER_AUTH_VERIFIED_DIGEST_SESSION_KEY)
}
