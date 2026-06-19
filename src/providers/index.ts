import { geminiProvider } from './gemini'
import type { Provider } from './types'

export type { Provider, ProviderFeatures } from './types'

const providers: Provider[] = [
    geminiProvider,
]

export function getActiveProvider(): Provider | null {
    const hostname = location.hostname.toLowerCase()
    return providers.find(provider => provider.hosts.includes(hostname)) ?? null
}

export function getProviderFeature(feature: keyof Provider['features']): boolean {
    const provider = getActiveProvider()
    return provider?.features[feature] ?? true
}

export function getConversationSource(id: string): string {
    const provider = getActiveProvider()
    if (provider?.getConversationSource) return provider.getConversationSource(id)
    return `${location.origin}/c/${id}`
}
