import {
    archiveConversation,
    deleteConversation,
    fetchAllConversations,
    fetchConversation,
    fetchProjects,
    getCurrentChatId,
    processConversation,
} from '../api'
import type { ConversationProvider } from './types'

export const chatGptProvider: ConversationProvider = {
    id: 'chatgpt',
    label: 'ChatGPT',
    getCurrentChatId,
    fetchConversation,
    processConversation,
    fetchProjects,
    fetchAllConversations,
    archiveConversation,
    deleteConversation,
}
