/**
 * Multi-provider architecture — shared contract.
 *
 * This file defines the `Provider` interface that the export pipeline depends
 * on. It deliberately REUSES the existing types from `../api.ts` (re-exported
 * below) rather than duplicating them, so a provider's output is byte-for-byte
 * compatible with what the md/html/json/text/image exporters already consume.
 *
 * The export pipeline only needs these capabilities from a provider:
 *   - identify the currently-open conversation        -> getCurrentChatId()
 *   - fetch one conversation (raw API shape)          -> fetchConversation()
 *   - list conversations for bulk export              -> fetchAllConversations()
 *   - normalize a raw conversation into the model the -> processConversation()
 *     exporters understand (ConversationResult)
 *
 * Adding a new provider (Claude, Gemini, ...) means implementing this
 * interface; the rest of the app stays provider-agnostic.
 */

// Re-export the canonical data types from the existing API layer so callers can
// import everything provider-related from one place without reaching into
// `../api.ts` directly. These are the SAME types the exporters already use.
export type {
    ApiConversationWithId,
    ApiConversationItem,
    ApiProjectInfo,
    ConversationResult,
    ConversationNode,
} from '../api'

import type {
    ApiConversationItem,
    ApiConversationWithId,
    ConversationResult,
} from '../api'

/**
 * A conversation source (ChatGPT, Claude, Gemini, ...).
 *
 * Implementations should be thin: they own the provider-specific knowledge of
 * how to read a conversation out of the page / backend API and how to map it
 * into the shared `ConversationResult`, and nothing more.
 */
export interface Provider {
    /** Stable, machine-readable id (e.g. `'chatgpt'`, `'claude'`, `'gemini'`). */
    id: string

    /** Human-readable label for UI / logging (e.g. `'ChatGPT'`). */
    label: string

    /**
     * Returns true if this provider is responsible for the given host.
     * Used by the registry to pick the active provider from `location.host`.
     */
    matchHost: (host: string) => boolean

    /** Resolve the id of the conversation currently open in the page. */
    getCurrentChatId: () => Promise<string>

    /**
     * Fetch a single conversation by id in the provider's raw API shape.
     * `replaceAssets` requests inline embedding of remote assets (images, etc.)
     * as data URIs where supported.
     */
    fetchConversation: (id: string, replaceAssets: boolean) => Promise<ApiConversationWithId>

    /**
     * List conversations for bulk export.
     * `project` scopes the listing to a project/folder when supported (null =
     * all conversations); `max` caps the number returned.
     */
    fetchAllConversations: (project?: string | null, max?: number) => Promise<ApiConversationItem[]>

    /**
     * Normalize a raw conversation into the shared `ConversationResult` that the
     * export pipeline (md/html/json/text/image) consumes.
     */
    processConversation: (conversation: ApiConversationWithId) => ConversationResult
}
