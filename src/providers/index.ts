import { chatgptProvider } from './chatgpt'
import { claudeProvider, isClaudeConversationExport } from './claude'
import type { ApiConversationWithId } from '../api'
import type { ClaudeConversationExport } from './claude'

export type ProviderConversation = ApiConversationWithId | ClaudeConversationExport

export type {
    ApiConversationItem,
    ApiProjectInfo,
    Citation,
    ConversationNodeMessage,
    ConversationResult,
} from '../api'

const providers = [
    claudeProvider,
    chatgptProvider,
] as const

export function getCurrentProvider() {
    const hostname = globalThis.location?.hostname ?? ''
    return providers.find(provider => provider.hosts.some(host => hostname === host || hostname.endsWith(`.${host}`)))
        ?? chatgptProvider
}

export function getCurrentChatId() {
    return getCurrentProvider().getCurrentChatId()
}

export function fetchConversation(chatId: string, shouldReplaceAssets: boolean): Promise<ProviderConversation> {
    return getCurrentProvider().fetchConversation(chatId, shouldReplaceAssets) as Promise<ProviderConversation>
}

export function processConversation(conversation: ProviderConversation) {
    if (isClaudeConversationExport(conversation)) {
        return claudeProvider.processConversation(conversation)
    }

    return chatgptProvider.processConversation(conversation)
}

export function checkIfConversationStarted() {
    return getCurrentProvider().checkIfConversationStarted()
}

export function fetchProjects() {
    return getCurrentProvider().fetchProjects?.() ?? Promise.resolve([])
}

export function fetchAllConversations(project: string | null = null, maxConversations = 1000) {
    return getCurrentProvider().fetchAllConversations?.(project, maxConversations) ?? Promise.resolve([])
}

export function archiveConversation(chatId: string) {
    const provider = getCurrentProvider()
    if (!provider.archiveConversation) {
        return Promise.reject(new Error(`${provider.label} conversation archiving is not supported.`))
    }

    return provider.archiveConversation(chatId)
}

export function deleteConversation(chatId: string) {
    const provider = getCurrentProvider()
    if (!provider.deleteConversation) {
        return Promise.reject(new Error(`${provider.label} conversation deletion is not supported.`))
    }

    return provider.deleteConversation(chatId)
}
