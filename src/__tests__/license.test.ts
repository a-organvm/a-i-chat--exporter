import { describe, expect, it } from 'vitest'
import {
    buildCheckoutReturnUrl,
    buildProCheckoutUrl,
    cleanLicenseReturnUrl,
    getLicenseFromUrl,
    maskLicense,
} from '../utils/license'

describe('license checkout helpers', () => {
    it('reads a license key from return query params', () => {
        const license = getLicenseFromUrl('https://chatgpt.com/?ce_license_key=  license-123  ')

        expect(license).toBe('license-123')
    })

    it('reads a license key from hash params', () => {
        const license = getLicenseFromUrl('https://chatgpt.com/#/return?license_key=license-456')

        expect(license).toBe('license-456')
    })

    it('cleans checkout return params after capture', () => {
        const cleanUrl = cleanLicenseReturnUrl('https://chatgpt.com/?ce_license_key=license-123&ce_checkout_return=1&model=gpt-4#license_key=license-456&view=done')
        const url = new URL(cleanUrl)

        expect(url.searchParams.get('model')).toBe('gpt-4')
        expect(url.searchParams.has('ce_license_key')).toBe(false)
        expect(url.searchParams.has('ce_checkout_return')).toBe(false)
        expect(url.hash).toBe('#view=done')
    })

    it('adds non-secret return metadata to the hosted checkout URL', () => {
        const checkoutUrl = buildProCheckoutUrl(
            'https://example.lemonsqueezy.com/buy/pro',
            'https://chatgpt.com/?ce_license_key=license-123',
        )
        const url = new URL(checkoutUrl ?? '')
        const returnUrl = new URL(url.searchParams.get('checkout[custom][return_url]') ?? '')

        expect(url.searchParams.get('checkout[custom][source]')).toBe('chatgpt-exporter')
        expect(returnUrl.origin).toBe('https://chatgpt.com')
        expect(returnUrl.searchParams.get('ce_checkout_return')).toBe('1')
        expect(returnUrl.searchParams.has('ce_license_key')).toBe(false)
    })

    it('rejects non-http checkout URLs', () => {
        expect(buildProCheckoutUrl('javascript:alert(1)', 'https://chatgpt.com/')).toBeNull()
    })

    it('builds a clean checkout return URL', () => {
        const returnUrl = new URL(buildCheckoutReturnUrl('https://chatgpt.com/?license=license-123&model=gpt-4'))

        expect(returnUrl.searchParams.get('model')).toBe('gpt-4')
        expect(returnUrl.searchParams.get('ce_checkout_return')).toBe('1')
        expect(returnUrl.searchParams.has('license')).toBe(false)
    })

    it('masks stored license keys', () => {
        expect(maskLicense('12345678-abcdef')).toBe('****-cdef')
    })
})
