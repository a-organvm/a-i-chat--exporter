/**
 * Gemini (gemini.google.com) provider — SCAFFOLD ONLY.
 *
 * Every method throws `NotImplemented` on purpose. This file makes the
 * multi-provider architecture real (the registry can list it, the build stays
 * green) while clearly documenting the exact extraction points a future
 * implementer must fill in against a LIVE Gemini session. Nothing here should
 * be wired into the export pipeline until these points are implemented.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IMPLEMENTATION GUIDE — fill these in with a real gemini.google.com session:
 *
 * NOTE: Gemini does NOT expose a clean public conversation API the way ChatGPT
 * does. It uses Google's "batchexecute" RPC transport (`/_/BardChatUi/data/
 * batchexecute`) with obfuscated RPC ids and an `at`/`bl` token, returning a
 * line-prefixed, doubly-JSON-encoded payload. Expect to either (a) reverse the
 * relevant RPC ids from a live session, or (b) fall back to scraping the
 * rendered DOM of the open conversation. Both approaches must be validated
 * against a real session — hence this scaffold.
 *
 * 1. getCurrentChatId(): Promise<string>
 *    - Gemini conversation URLs look like `/app/<conversation_id>`. Parse the
 *      id from `location.pathname` (compare ChatGPT's `getChatIdFromUrl` in
 *      `../page.ts`). The id also appears as `c_<hex>` in some payloads.
 *
 * 2. fetchConversation(id, replaceAssets): Promise<ApiConversationWithId>
 *    - Source A (RPC): call batchexecute with the conversation-fetch RPC id
 *      (must be reversed from a live session) using the page's `at` token;
 *      parse the line-prefixed `)]}'`-style response and the nested
 *      JSON-in-JSON to recover the ordered turns.
 *    - Source B (DOM fallback): read the rendered turns from the page
 *      (user prompts and model responses are in distinct containers).
 *    - Each Gemini turn is a (prompt, response) pair — a FLAT, ordered list,
 *      NOT ChatGPT's parent/child `mapping` tree.
 *    - MAPPING -> ApiConversationWithId: synthesize ChatGPT's tree shape.
 *      For each turn emit two `ConversationNode`s (user then assistant),
 *      chained linearly via `parent`/`children`, each carrying a
 *      `ConversationNodeMessage` with `author.role` ('user' | 'assistant') and
 *      `content: { content_type: 'text', parts: [text] }`. Set `current_node`
 *      to the last node id, `mapping` to the keyed nodes, and fill `id`,
 *      `title`, `create_time`, `update_time` (Gemini timestamps may be
 *      approximate / absent — default sensibly).
 *    - replaceAssets: inline any generated images / uploaded files as data
 *      URIs (mirror `replaceImageAssets` in `../api.ts`).
 *
 * 3. fetchAllConversations(project, max): Promise<ApiConversationItem[]>
 *    - The conversation list is loaded via its own batchexecute RPC id (the
 *      left-hand "Recent" panel). Reverse it from a live session and map each
 *      entry to `ApiConversationItem` { id, title, create_time }, capped at
 *      `max`. `project` has no Gemini equivalent today — accept and ignore, or
 *      map to Gems if/when supported.
 *
 * 4. processConversation(conv): ConversationResult
 *    - Once fetchConversation returns the synthesized tree above, delegate to
 *      `processConversation` from `../api.ts` (shape-driven, not
 *      ChatGPT-specific) for traversal. Set `model` to the Gemini model name
 *      (e.g. 'Gemini') and `modelSlug` accordingly.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type {
    ApiConversationItem,
    ApiConversationWithId,
    ConversationResult,
    Provider,
} from './types'

const NOT_IMPLEMENTED = 'NotImplemented: gemini export needs live session mapping'

export const geminiProvider: Provider = {
    id: 'gemini',
    label: 'Gemini',

    matchHost: host => host.includes('gemini.google.com'),

    getCurrentChatId(): Promise<string> {
        throw new Error(NOT_IMPLEMENTED)
    },

    fetchConversation(_id: string, _replaceAssets: boolean): Promise<ApiConversationWithId> {
        throw new Error(NOT_IMPLEMENTED)
    },

    fetchAllConversations(_project?: string | null, _max?: number): Promise<ApiConversationItem[]> {
        throw new Error(NOT_IMPLEMENTED)
    },

    processConversation(_conversation: ApiConversationWithId): ConversationResult {
        throw new Error(NOT_IMPLEMENTED)
    },
}
