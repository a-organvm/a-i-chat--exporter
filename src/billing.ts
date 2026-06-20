import { KEY_PRO_LICENSE_INSTANCE_ID, KEY_PRO_LICENSE_KEY } from './constants'
import { cleanLicenseReturnUrl, getLicenseFromUrl } from './utils/license'
import { ScriptStorage } from './utils/storage'

interface BrowserHistoryLike {
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void
}

export function captureLicenseReturnFromUrl(
    input: string | URL | Location = window.location,
    history: BrowserHistoryLike | null = typeof window !== 'undefined' ? window.history : null,
) {
    const licenseKey = getLicenseFromUrl(input)
    const cleanUrl = cleanLicenseReturnUrl(input)
    const currentUrl = input.toString()

    if (licenseKey) {
        ScriptStorage.set(KEY_PRO_LICENSE_KEY, licenseKey)
        ScriptStorage.delete(KEY_PRO_LICENSE_INSTANCE_ID)
    }

    if (history && cleanUrl !== currentUrl) {
        history.replaceState(null, typeof document !== 'undefined' ? document.title : '', cleanUrl)
    }

    return !!licenseKey
}
