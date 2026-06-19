import type {
    ApiConversationItem,
    ApiConversationWithId,
    ApiProjectInfo,
    ConversationResult,
} from '../api'

export type {
    ApiConversationItem,
    ApiConversationWithId,
    ApiProjectInfo,
    Citation,
    ConversationNodeMessage,
    ConversationResult,
} from '../api'

export interface ConversationProvider {
    id: string
    label: string
    getCurrentChatId: () => Promise<string>
    fetchConversation: (chatId: string, shouldReplaceAssets: boolean) => Promise<ApiConversationWithId>
    processConversation: (conversation: ApiConversationWithId) => ConversationResult
    fetchProjects: () => Promise<ApiProjectInfo[]>
    fetchAllConversations: (project?: string | null, maxConversations?: number) => Promise<ApiConversationItem[]>
    archiveConversation: (chatId: string) => Promise<boolean>
    deleteConversation: (chatId: string) => Promise<boolean>
}
