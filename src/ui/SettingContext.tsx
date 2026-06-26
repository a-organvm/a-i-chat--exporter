import { createContext, useContext } from 'preact/compat'
import { useCallback, useMemo } from 'preact/hooks'
import {
    KEY_EXPORT_ALL_LIMIT,
    KEY_FILENAME_FORMAT,
    KEY_LICENSE,
    KEY_META_ENABLED,
    KEY_META_LIST,
    KEY_TIMESTAMP_24H,
    KEY_TIMESTAMP_ENABLED,
    KEY_TIMESTAMP_HTML,
    KEY_TIMESTAMP_MARKDOWN,
} from '../constants'
import { useGMStorage } from '../hooks/useGMStorage'
import { useLicense } from '../hooks/useLicense'
import { FREE_STATUS, hasFeature, isProUnlocked } from '../utils/license'
import type { LicenseStatus } from '../utils/license'
import type { FC } from 'preact/compat'

const defaultFormat = 'ChatGPT-{title}'
const defaultExportAllLimit = 1000

export const PRO_FEATURES = {
    bulkExport: 'bulk-export',
    multiProviderExport: 'multi-provider-export',
} as const

export type ProFeature = typeof PRO_FEATURES[keyof typeof PRO_FEATURES]
export type ProGateReason = 'missing-license-key' | 'unverified-license-key'

export interface ProFeatureAccess {
    feature: ProFeature
    allowed: boolean
    reason: ProGateReason | null
}

export interface ExportMeta {
    name: string
    value: string
}

const defaultExportMetaList: ExportMeta[] = [
    { name: 'title', value: '{title}' },
    { name: 'source', value: '{source}' },
]

export function normalizeLicenseKey(licenseKey: string) {
    return licenseKey.trim()
}

export function hasLicenseKey(licenseKey: string) {
    return normalizeLicenseKey(licenseKey).length > 0
}

/**
 * Gate a Pro feature against a *verified* license status. A key must pass
 * signed-key / Lemon Squeezy verification (see `utils/license`) and actually
 * grant the requested feature — a merely-present key does not unlock anything.
 */
export function checkLicenseGate(
    feature: ProFeature,
    status: LicenseStatus,
    licenseKey = '',
): ProFeatureAccess {
    const allowed = hasFeature(status, feature)

    let reason: ProGateReason | null = null
    if (!allowed) {
        reason = hasLicenseKey(licenseKey) ? 'unverified-license-key' : 'missing-license-key'
    }

    return { feature, allowed, reason }
}

interface SettingContextValue {
    format: string
    setFormat: (value: string) => void

    enableTimestamp: boolean
    setEnableTimestamp: (value: boolean) => void
    timeStamp24H: boolean
    setTimeStamp24H: (value: boolean) => void
    enableTimestampHTML: boolean
    setEnableTimestampHTML: (value: boolean) => void
    enableTimestampMarkdown: boolean
    setEnableTimestampMarkdown: (value: boolean) => void

    enableMeta: boolean
    setEnableMeta: (value: boolean) => void
    exportMetaList: ExportMeta[]
    setExportMetaList: (value: ExportMeta[]) => void
    exportAllLimit: number
    setExportAllLimit: (value: number) => void

    licenseKey: string
    setLicenseKey: (value: string) => void
    licenseStatus: LicenseStatus
    licenseVerifying: boolean
    hasProLicense: boolean
    checkProFeature: (feature: ProFeature) => ProFeatureAccess

    resetDefault: () => void
}

const SettingContext = createContext<SettingContextValue>({
    format: defaultFormat,
    setFormat: (_: string) => {},

    enableTimestamp: false,
    setEnableTimestamp: (_: boolean) => {},
    timeStamp24H: false,
    setTimeStamp24H: (_: boolean) => {},
    enableTimestampHTML: false,
    setEnableTimestampHTML: (_: boolean) => {},
    enableTimestampMarkdown: false,
    setEnableTimestampMarkdown: (_: boolean) => {},

    enableMeta: false,
    setEnableMeta: (_: boolean) => {},
    exportMetaList: defaultExportMetaList,
    setExportMetaList: (_: ExportMeta[]) => {},
    exportAllLimit: defaultExportAllLimit,
    setExportAllLimit: (_: number) => {},

    licenseKey: '',
    setLicenseKey: (_: string) => {},
    licenseStatus: FREE_STATUS,
    licenseVerifying: false,
    hasProLicense: false,
    checkProFeature: feature => checkLicenseGate(feature, FREE_STATUS),

    resetDefault: () => {},
})

export const SettingProvider: FC = ({ children }) => {
    const [format, setFormat] = useGMStorage(KEY_FILENAME_FORMAT, defaultFormat)

    const [enableTimestamp, setEnableTimestamp] = useGMStorage(KEY_TIMESTAMP_ENABLED, false)
    const [timeStamp24H, setTimeStamp24H] = useGMStorage(KEY_TIMESTAMP_24H, false)
    const [enableTimestampHTML, setEnableTimestampHTML] = useGMStorage(KEY_TIMESTAMP_HTML, false)
    const [enableTimestampMarkdown, setEnableTimestampMarkdown] = useGMStorage(KEY_TIMESTAMP_MARKDOWN, false)

    const [enableMeta, setEnableMeta] = useGMStorage(KEY_META_ENABLED, false)

    const [exportMetaList, setExportMetaList] = useGMStorage(KEY_META_LIST, defaultExportMetaList)
    const [exportAllLimit, setExportAllLimit] = useGMStorage(KEY_EXPORT_ALL_LIMIT, defaultExportAllLimit)
    const [license, setLicense] = useGMStorage(KEY_LICENSE, '')
    const isPro = useMemo(() => license.trim().length > 0, [license])

    useEffect(() => {
        const licenseFromUrl = getLicenseFromUrl()
        if (!licenseFromUrl) return

        setLicense(licenseFromUrl)
        scrubLicenseReturnUrl()
    }, [])

    const { licenseKey, setLicenseKey, status: licenseStatus, verifying: licenseVerifying } = useLicense()

    const hasProLicense = useMemo(() => isProUnlocked(licenseStatus), [licenseStatus])
    const checkProFeature = useCallback(
        (feature: ProFeature) => checkLicenseGate(feature, licenseStatus, licenseKey),
        [licenseStatus, licenseKey],
    )

    const resetDefault = useCallback(() => {
        setFormat(defaultFormat)
        setEnableTimestamp(false)
        setEnableMeta(false)
        setExportMetaList(defaultExportMetaList)
        setExportAllLimit(defaultExportAllLimit)
    }, [
        setFormat,
        setEnableTimestamp,
        setEnableMeta,
        setExportMetaList,
        setExportAllLimit,
    ])

    return (
        <SettingContext.Provider
            value={{
                format,
                setFormat,

                enableTimestamp,
                setEnableTimestamp,
                timeStamp24H,
                setTimeStamp24H,
                enableTimestampHTML,
                setEnableTimestampHTML,
                enableTimestampMarkdown,
                setEnableTimestampMarkdown,

                enableMeta,
                setEnableMeta,
                exportMetaList,
                setExportMetaList,

                exportAllLimit,
                setExportAllLimit,

                licenseKey,
                setLicenseKey,
                licenseStatus,
                licenseVerifying,
                hasProLicense,
                checkProFeature,

                resetDefault,
            }}
        >
            {children}
        </SettingContext.Provider>
    )
}

export const useSettingContext = () => useContext(SettingContext)
