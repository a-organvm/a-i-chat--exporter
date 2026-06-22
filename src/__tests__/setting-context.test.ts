import { describe, expect, it } from 'vitest'
import {
    PRO_FEATURES,
    checkLicenseGate,
    hasLicenseKey,
    normalizeLicenseKey,
} from '../ui/SettingContext'
import { FREE_STATUS } from '../utils/license'
import type { LicenseStatus } from '../utils/license'

const VALID_PRO_STATUS: LicenseStatus = {
    valid: true,
    tier: 'pro',
    features: [PRO_FEATURES.bulkExport],
}

describe('SettingContext license helpers', () => {
    it('normalizes license keys before checking whether one is present', () => {
        expect(normalizeLicenseKey('  license-key  ')).toBe('license-key')
        expect(hasLicenseKey('  license-key  ')).toBe(true)
        expect(hasLicenseKey('   ')).toBe(false)
    })

    it('denies a pro feature with a missing-license-key reason when no key is stored', () => {
        expect(checkLicenseGate(PRO_FEATURES.bulkExport, FREE_STATUS)).toEqual({
            feature: PRO_FEATURES.bulkExport,
            allowed: false,
            reason: 'missing-license-key',
        })

        expect(checkLicenseGate(PRO_FEATURES.bulkExport, FREE_STATUS, '   ')).toEqual({
            feature: PRO_FEATURES.bulkExport,
            allowed: false,
            reason: 'missing-license-key',
        })
    })

    it('distinguishes a present but unverified key from a missing key', () => {
        expect(checkLicenseGate(PRO_FEATURES.bulkExport, FREE_STATUS, 'stored-key')).toEqual({
            feature: PRO_FEATURES.bulkExport,
            allowed: false,
            reason: 'unverified-license-key',
        })
    })

    it('allows only features granted by a verified pro license', () => {
        expect(checkLicenseGate(PRO_FEATURES.bulkExport, VALID_PRO_STATUS, 'stored-key')).toEqual({
            feature: PRO_FEATURES.bulkExport,
            allowed: true,
            reason: null,
        })

        expect(checkLicenseGate(PRO_FEATURES.multiProviderExport, VALID_PRO_STATUS, 'stored-key')).toEqual({
            feature: PRO_FEATURES.multiProviderExport,
            allowed: false,
            reason: 'unverified-license-key',
        })
    })

    it('does not unlock features from a valid pro tier without explicit grants', () => {
        const statusWithoutFeatures: LicenseStatus = {
            valid: true,
            tier: 'pro',
            features: [],
        }

        expect(checkLicenseGate(PRO_FEATURES.bulkExport, statusWithoutFeatures, 'stored-key')).toEqual({
            feature: PRO_FEATURES.bulkExport,
            allowed: false,
            reason: 'unverified-license-key',
        })
    })
})
