import type { ApiConversationItem, ApiConversationWithId, ApiProjectInfo } from '../api'

export interface ProviderFeatures {
    bulkExport?: boolean
    archive?: boolean
    delete?: boolean
    projects?: boolean
    timestamps?: boolean
    png?: boolean
}

export interface Provider {
    id: string
    name: string
    hosts: string[]
    features: ProviderFeatures
    getChatIdFromUrl?: () => string | null
    getCurrentChatId?: () => Promise<string>
    fetchConversation?: (chatId: string, shouldReplaceAssets: boolean) => Promise<ApiConversationWithId>
    fetchAllConversations?: (project: string | null, maxConversations: number) => Promise<ApiConversationItem[]>
    fetchProjects?: () => Promise<ApiProjectInfo[]>
    archiveConversation?: (chatId: string) => Promise<boolean>
    deleteConversation?: (chatId: string) => Promise<boolean>
    checkIfConversationStarted?: () => boolean
    getUserAvatar?: () => Promise<string>
    getConversationSource?: (id: string) => string
    getScreenshotTarget?: () => HTMLElement | null
    mountMenu?: (getMenuContainer: () => HTMLDivElement) => void
}
