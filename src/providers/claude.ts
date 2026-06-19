/**
 * Claude (claude.ai) provider — SCAFFOLD ONLY.
 *
 * Every method throws `NotImplemented` on purpose. This file makes the
 * multi-provider architecture real (the registry can list it, the build stays
 * green) while clearly documenting the exact extraction points a future
 * implementer must fill in against a LIVE Claude session. Nothing here should
 * be wired into the export pipeline until these points are implemented.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IMPLEMENTATION GUIDE — fill these in with a real claude.ai session:
 *
 * 1. getCurrentChatId(): Promise<string>
 *    - claude.ai conversation URLs look like `/chat/<uuid>`. Parse the uuid
 *      from `location.pathname` (compare with ChatGPT's `getChatIdFromUrl`
 *      in `../page.ts`).
 *    - If no id is in the URL, the active org's conversation list endpoint
 *      (see #3) can be queried and the most-recent conversation returned.
 *
 * 2. fetchConversation(id, replaceAssets): Promise<ApiConversationWithId>
 *    - Claude's web app calls its backend at:
 *        GET /api/organizations/<org_uuid>/chat_conversations/<id>?tree=True&rendering_mode=messages
 *      The `<org_uuid>` comes from the bootstrap/session payload embedded in
 *      the page (analogous to ChatGPT's `getPageAccessToken` in `../page.ts`).
 *    - The response is a conversation with `chat_messages[]` (each: `uuid`,
 *      `sender` = 'human' | 'assistant', `text`/`content[]`, `created_at`,
 *      `updated_at`, attachments, files). This is a FLAT message list, NOT the
 *      parent/child `mapping` tree ChatGPT uses.
 *    - MAPPING -> ApiConversationWithId: synthesize ChatGPT's tree shape from
 *      the flat list. For each Claude message build a `ConversationNode`
 *      (`id`, `parent`, `children: [nextId]`, and a `ConversationNodeMessage`
 *      with `author.role` mapped 'human'->'user' / 'assistant'->'assistant',
 *      `content: { content_type: 'text', parts: [text] }`, `create_time`).
 *      Chain them linearly (each node's child = the next message). Set
 *      `current_node` to the last message id and `mapping` to the keyed nodes.
 *      Populate `id`, `title`, `create_time`, `update_time`.
 *    - replaceAssets: if true, fetch Claude file/image attachments and inline
 *      them as data URIs (mirror `replaceImageAssets` in `../api.ts`).
 *
 * 3. fetchAllConversations(project, max): Promise<ApiConversationItem[]>
 *    - List endpoint:
 *        GET /api/organizations/<org_uuid>/chat_conversations
 *      Map each entry to `ApiConversationItem` { id: uuid, title: name,
 *      create_time }. There is no offset pagination contract documented here;
 *      verify against the live API and cap at `max`. `project` maps to Claude
 *      "Projects" if/when that listing is supported.
 *
 * 4. processConversation(conv): ConversationResult
 *    - Once fetchConversation returns the synthesized tree above, this can
 *      reuse the SAME traversal logic ChatGPT uses. Easiest path: import and
 *      delegate to `processConversation` from `../api.ts` (it is
 *      shape-driven, not ChatGPT-specific) once the tree is well-formed.
 *      Set `model` to the Claude model name (e.g. from message metadata) and
 *      `modelSlug` accordingly.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type {
    ApiConversationItem,
    ApiConversationWithId,
    ConversationResult,
    Provider,
} from './types'

const NOT_IMPLEMENTED = 'NotImplemented: claude export needs live session mapping'

export const claudeProvider: Provider = {
    id: 'claude',
    label: 'Claude',

    matchHost: host => host.includes('claude.ai'),

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
