import { useEffect, useState } from 'preact/hooks'
import { KEY_PRO_LICENSE_KEY } from '../constants'
import { FREE_STATUS, hasFeature as hasFeatureFor, isProUnlocked, verifyLicense } from '../utils/license'
import { useGMStorage } from './useGMStorage'
import type { LicenseStatus } from '../utils/license'

/**
 * Reads the stored licence key, verifies it (offline signed-key check first,
 * falling back to the Lemon Squeezy API), and exposes the resulting Pro status.
 * Fails closed: while verifying, or on any error, the user stays on the free tier.
 */
export function useLicense() {
    const [licenseKey, setLicenseKey] = useGMStorage(KEY_PRO_LICENSE_KEY, '')
    const [status, setStatus] = useState<LicenseStatus>(FREE_STATUS)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        let cancelled = false

        if (!licenseKey?.trim()) {
            setStatus(FREE_STATUS)
            setVerifying(false)
            return
        }

        setVerifying(true)
        verifyLicense(licenseKey, { online: true })
            .then((result) => { if (!cancelled) setStatus(result) })
            .catch(() => { if (!cancelled) setStatus(FREE_STATUS) }) // fail closed
            .finally(() => { if (!cancelled) setVerifying(false) })

        return () => { cancelled = true }
    }, [licenseKey])

    return {
        licenseKey,
        setLicenseKey,
        status,
        verifying,
        isPro: isProUnlocked(status),
        hasFeature: (feature: string) => hasFeatureFor(status, feature),
    }
}
