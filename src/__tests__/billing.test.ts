import { describe, expect, it, vi } from 'vitest'
import { KEY_PRO_LICENSE_INSTANCE_ID, KEY_PRO_LICENSE_KEY } from '../constants'

const storage = vi.hoisted(() => new Map<string, unknown>())

vi.mock('../utils/storage', () => ({
    ScriptStorage: {
        get: <T>(key: string): T | null => storage.has(key) ? storage.get(key) as T : null,
        set: <T>(key: string, value: T): void => {
            storage.set(key, value)
        },
        delete: (key: string): void => {
            storage.delete(key)
        },
    },
}))

import { captureLicenseReturnFromUrl } from '../billing'

describe('captureLicenseReturnFromUrl', () => {
    it('stores a returned license key, clears stale instance state, and scrubs the URL', () => {
        storage.clear()
        storage.set(KEY_PRO_LICENSE_INSTANCE_ID, 'old-instance')
        const history = { replaceState: vi.fn() }

        const captured = captureLicenseReturnFromUrl(
            'https://chatgpt.com/?ce_license_key=%20license-123%20&ce_checkout_return=1&model=gpt-4',
            history,
        )

        const cleanUrl = history.replaceState.mock.calls[0][2] as string
        const url = new URL(cleanUrl)

        expect(captured).toBe(true)
        expect(storage.get(KEY_PRO_LICENSE_KEY)).toBe('license-123')
        expect(storage.has(KEY_PRO_LICENSE_INSTANCE_ID)).toBe(false)
        expect(url.searchParams.get('model')).toBe('gpt-4')
        expect(url.searchParams.has('ce_license_key')).toBe(false)
        expect(url.searchParams.has('ce_checkout_return')).toBe(false)
    })

    it('scrubs checkout parameters even when no license key is present', () => {
        storage.clear()
        const history = { replaceState: vi.fn() }

        const captured = captureLicenseReturnFromUrl(
            'https://chatgpt.com/?ce_checkout_return=1&model=gpt-4',
            history,
        )

        expect(captured).toBe(false)
        expect(storage.has(KEY_PRO_LICENSE_KEY)).toBe(false)
        expect(history.replaceState).toHaveBeenCalledTimes(1)
    })
})
