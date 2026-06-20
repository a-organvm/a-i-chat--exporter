import { useCallback, useEffect, useState } from 'preact/hooks'
import { KEY_PRO_LICENSE_INSTANCE_ID, KEY_PRO_LICENSE_KEY } from '../constants'
import { FREE_STATUS, hasFeature as hasFeatureFor, isProUnlocked, verifyLicense } from '../utils/license'
import { useGMStorage } from './useGMStorage'
import type { LicenseStatus } from '../utils/license'

/**
 * Reads the stored licence key, verifies it (offline signed-key check first,
 * falling back to Lemon Squeezy validation/activation), and exposes the
 * resulting Pro status.
 * Fails closed: while verifying, or on any error, the user stays on the free tier.
 */
export function useLicense() {
    const [licenseKey, setLicenseKey] = useGMStorage(KEY_PRO_LICENSE_KEY, '')
    const [licenseInstanceId, setLicenseInstanceId] = useGMStorage(KEY_PRO_LICENSE_INSTANCE_ID, '')
    const [status, setStatus] = useState<LicenseStatus>(FREE_STATUS)
    const [verifying, setVerifying] = useState(false)
    const updateLicenseKey = useCallback((value: string) => {
        setLicenseKey(value)
        if (value.trim() !== licenseKey.trim() && licenseInstanceId) {
            setLicenseInstanceId('')
        }
    }, [licenseKey, licenseInstanceId, setLicenseKey, setLicenseInstanceId])

    useEffect(() => {
        let cancelled = false

        if (!licenseKey?.trim()) {
            setStatus(FREE_STATUS)
            setVerifying(false)
            if (licenseInstanceId) setLicenseInstanceId('')
            return
        }

        setVerifying(true)
        verifyLicense(licenseKey, {
            online: true,
            instanceId: licenseInstanceId,
        })
            .then((result) => {
                if (cancelled) return

                setStatus(result)
                if (result.instanceId && result.instanceId !== licenseInstanceId) {
                    setLicenseInstanceId(result.instanceId)
                }
                else if (result.valid && !result.instanceId && licenseInstanceId) {
                    setLicenseInstanceId('')
                }
            })
            .catch(() => { if (!cancelled) setStatus(FREE_STATUS) }) // fail closed
            .finally(() => { if (!cancelled) setVerifying(false) })

        return () => { cancelled = true }
    }, [licenseKey, licenseInstanceId])

    return {
        licenseKey,
        setLicenseKey: updateLicenseKey,
        status,
        verifying,
        isPro: isProUnlocked(status),
        hasFeature: (feature: string) => hasFeatureFor(status, feature),
    }
}
