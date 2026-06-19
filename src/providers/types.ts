import type { ApiConversationItem, ApiProjectInfo, ConversationResult } from '../api'

export interface Provider<TConversation = unknown> {
    id: string
    label: string
    hosts: string[]
    getCurrentChatId: () => Promise<string>
    fetchConversation: (chatId: string, shouldReplaceAssets: boolean) => Promise<TConversation>
    processConversation: (conversation: TConversation) => ConversationResult
    checkIfConversationStarted: () => boolean
    fetchAllConversations?: (project?: string | null, maxConversations?: number) => Promise<ApiConversationItem[]>
    fetchProjects?: () => Promise<ApiProjectInfo[]>
    archiveConversation?: (chatId: string) => Promise<boolean>
    deleteConversation?: (chatId: string) => Promise<boolean>
}
