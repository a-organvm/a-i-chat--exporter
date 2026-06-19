import { chatGptProvider } from './chatgpt'
import type { ConversationProvider } from './types'

const providers = [chatGptProvider] as const
let activeProviderId: ConversationProvider['id'] = chatGptProvider.id

export function getActiveProvider(): ConversationProvider {
    return providers.find(provider => provider.id === activeProviderId) ?? chatGptProvider
}

export function setActiveProvider(providerId: ConversationProvider['id']) {
    if (!providers.some(provider => provider.id === providerId)) {
        throw new Error(`Unknown provider: ${providerId}`)
    }

    activeProviderId = providerId
}

export function getProviders(): readonly ConversationProvider[] {
    return providers
}

export type {
    ApiConversationItem,
    ApiConversationWithId,
    ApiProjectInfo,
    Citation,
    ConversationNodeMessage,
    ConversationProvider,
    ConversationResult,
} from './types'
