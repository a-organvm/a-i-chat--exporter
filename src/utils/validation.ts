/**
 * Input validation for the exporter's request path.
 *
 * The API helpers in `api.ts` interpolate caller-supplied values (chat ids,
 * pagination cursors) into request URLs. Validating them up front turns
 * malformed input into clear, actionable errors instead of opaque network
 * failures or malformed requests.
 */

/** Thrown when caller-supplied input fails validation. */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError
        || (typeof error === 'object' && error !== null && 'name' in error
            && (error as { name: unknown }).name === 'ValidationError')
}

const SHARE_PREFIX = '__share__'

// Conversation ids are UUID-like slugs. We allow the share prefix and a
// permissive-but-safe character set (alphanumerics, dashes, underscores) to
// avoid breaking on future id formats while still rejecting path-traversal
// (`/`, `..`) and whitespace.
const CHAT_ID_PATTERN = /^[a-z0-9_-]+$/i

/**
 * Validate a conversation/chat id and return it normalized (trimmed).
 * Accepts the internal `__share__<id>` form used for shared conversations.
 */
export function assertValidChatId(chatId: unknown, label = 'chatId'): string {
    if (typeof chatId !== 'string') {
        throw new ValidationError(`${label} must be a string, received ${typeof chatId}.`)
    }

    const trimmed = chatId.trim()
    if (trimmed.length === 0) {
        throw new ValidationError(`${label} must not be empty.`)
    }

    const core = trimmed.startsWith(SHARE_PREFIX)
        ? trimmed.slice(SHARE_PREFIX.length)
        : trimmed

    if (core.length === 0 || !CHAT_ID_PATTERN.test(core)) {
        throw new ValidationError(`${label} has an invalid format.`)
    }

    return trimmed
}

/**
 * Validate pagination parameters. Offsets/limits must be non-negative, finite
 * integers; limit additionally must be positive and within a sane bound.
 */
export function assertValidPagination(offset: number, limit: number): void {
    if (!Number.isInteger(offset) || offset < 0) {
        throw new ValidationError(`offset must be a non-negative integer, received ${offset}.`)
    }
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new ValidationError(`limit must be a positive integer, received ${limit}.`)
    }
    if (limit > 1000) {
        throw new ValidationError(`limit must not exceed 1000, received ${limit}.`)
    }
}

/**
 * Validate that a request URL is a non-empty, absolute http(s) URL. Guards
 * against the case where the backend API base is unconfigured for the current
 * origin (which would otherwise produce a broken `undefined/...` request).
 */
export function assertValidRequestUrl(url: unknown, label = 'request url'): string {
    if (typeof url !== 'string' || url.trim().length === 0) {
        throw new ValidationError(`${label} is not configured for this site.`)
    }

    let parsed: URL
    try {
        parsed = new URL(url)
    }
    catch {
        throw new ValidationError(`${label} is not a valid URL.`)
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ValidationError(`${label} must use http(s), received ${parsed.protocol}.`)
    }

    return url
}

/**
 * Validate and sanitize URLs for use in HTML attributes (src, href, etc).
 * Rejects javascript:, data:, and other potentially dangerous protocols.
 * Allows https:, http:, mailto:, and blob: (for exported assets).
 */
export function assertValidHtmlUrl(url: unknown, label = 'URL'): string {
    if (typeof url !== 'string' || url.trim().length === 0) {
        throw new ValidationError(`${label} must not be empty.`)
    }

    const trimmed = url.trim()

    // Allow data URIs for base64-encoded images (used for avatars)
    if (trimmed.startsWith('data:')) {
        // Basic validation: ensure it's a well-formed data URI
        if (/^data:[a-z]+\/[a-z0-9+.-]+;[a-z0-9]+,/.test(trimmed)) {
            return trimmed
        }
        throw new ValidationError(`${label} is not a valid data URI.`)
    }

    // Allow blob URLs for exported assets
    if (trimmed.startsWith('blob:')) {
        return trimmed
    }

    // Allow standard web URLs
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            new URL(trimmed)
            return trimmed
        }
        catch {
            throw new ValidationError(`${label} is not a valid URL.`)
        }
    }

    // Allow mailto links
    if (trimmed.startsWith('mailto:')) {
        return trimmed
    }

    // Reject everything else (javascript:, vbscript:, etc)
    throw new ValidationError(`${label} uses an unsupported protocol.`)
}
