/**
 * ChatGPT provider.
 *
 * This is a THIN WRAPPER around the existing `../api.ts` implementation — it
 * does not reimplement any logic. The functions in `api.ts` remain the single
 * source of truth for ChatGPT behavior; this file only adapts them to the
 * shared `Provider` interface so ChatGPT can sit alongside future providers
 * (Claude, Gemini) in the registry. ChatGPT behavior is therefore unchanged.
 */
import {
    fetchAllConversations,
    fetchConversation,
    getCurrentChatId,
    processConversation,
} from '../api'
import type { Provider } from './types'

export const chatgptProvider: Provider = {
    id: 'chatgpt',
    label: 'ChatGPT',

    matchHost: host => host.includes('chatgpt.com') || host.includes('chat.openai.com'),

    getCurrentChatId,
    fetchConversation,
    fetchAllConversations,
    processConversation,
}
