import { createContext, useContext } from 'preact/compat'
import { useCallback, useMemo } from 'preact/hooks'
import {
    KEY_EXPORT_ALL_LIMIT,
    KEY_FILENAME_FORMAT,
    KEY_META_ENABLED,
    KEY_META_LIST,
    KEY_PRO_LICENSE_KEY,
    KEY_TIMESTAMP_24H,
    KEY_TIMESTAMP_ENABLED,
    KEY_TIMESTAMP_HTML,
    KEY_TIMESTAMP_MARKDOWN,
} from '../constants'
import { useGMStorage } from '../hooks/useGMStorage'
import type { FC } from 'preact/compat'

const defaultFormat = 'ChatGPT-{title}'
const defaultExportAllLimit = 1000
const defaultLicenseKey = ''

export const PRO_FEATURES = {
    bulkExport: 'bulk-export',
    multiProviderExport: 'multi-provider-export',
} as const

export type ProFeature = typeof PRO_FEATURES[keyof typeof PRO_FEATURES]
export type ProGateReason = 'missing-license-key'

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

export function checkLicenseGate(feature: ProFeature, licenseKey: string): ProFeatureAccess {
    // Replace this local scaffold with Lemon Squeezy validation when licensing is wired.
    const allowed = hasLicenseKey(licenseKey)

    return {
        feature,
        allowed,
        reason: allowed ? null : 'missing-license-key',
    }
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

    licenseKey: defaultLicenseKey,
    setLicenseKey: (_: string) => {},
    hasProLicense: false,
    checkProFeature: feature => checkLicenseGate(feature, defaultLicenseKey),

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
    const [licenseKey, setLicenseKey] = useGMStorage(KEY_PRO_LICENSE_KEY, defaultLicenseKey)

    const hasProLicense = useMemo(() => hasLicenseKey(licenseKey), [licenseKey])
    const checkProFeature = useCallback(
        (feature: ProFeature) => checkLicenseGate(feature, licenseKey),
        [licenseKey],
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
