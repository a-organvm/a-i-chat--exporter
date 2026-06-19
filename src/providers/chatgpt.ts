import {
    archiveConversation,
    deleteConversation,
    fetchAllConversations,
    fetchConversation,
    fetchProjects,
    getCurrentChatId,
    processConversation,
} from '../api'
import { checkIfConversationStarted } from '../page'
import type { ApiConversationWithId } from '../api'
import type { Provider } from './types'

export const chatgptProvider: Provider<ApiConversationWithId> = {
    id: 'chatgpt',
    label: 'ChatGPT',
    hosts: ['chat.openai.com', 'chatgpt.com', 'new.oaifree.com'],
    getCurrentChatId,
    fetchConversation,
    processConversation,
    checkIfConversationStarted,
    fetchAllConversations,
    fetchProjects,
    archiveConversation,
    deleteConversation,
}
