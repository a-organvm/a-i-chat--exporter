/**
 * Provider registry.
 *
 * Central list of all conversation providers and the resolver that picks the
 * active one from the current page host. The export pipeline can stay
 * provider-agnostic by going through `getActiveProvider()` instead of importing
 * `../api.ts` directly.
 *
 * Order matters: the first provider whose `matchHost` returns true wins.
 * `chatgptProvider` is the fallback so behavior is identical to today on any
 * unrecognized host.
 */
import { chatgptProvider } from './chatgpt'
import { claudeProvider } from './claude'
import { geminiProvider } from './gemini'
import type { Provider } from './types'

export type { Provider } from './types'
export { chatgptProvider } from './chatgpt'
export { claudeProvider } from './claude'
export { geminiProvider } from './gemini'

/** All known providers, in match-priority order. */
export const providers: Provider[] = [
    chatgptProvider,
    claudeProvider,
    geminiProvider,
]

/**
 * Resolve the provider for a given host (defaults to `location.host`).
 * Falls back to `chatgptProvider` so existing behavior is preserved when no
 * provider explicitly matches.
 */
export function getActiveProvider(host: string = location.host): Provider {
    return providers.find(provider => provider.matchHost(host)) ?? chatgptProvider
}
