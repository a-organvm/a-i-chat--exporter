const CHECKOUT_RETURN_PARAM = 'ce_checkout_return'
const CHECKOUT_SOURCE = 'chatgpt-exporter'

export const LEMON_SQUEEZY_CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL ?? ''

export const LICENSE_PARAM_NAMES = [
    'ce_license_key',
    'license_key',
    'licenseKey',
    'license',
    'lemon_squeezy_license_key',
    'lemonsqueezy_license_key',
]

function toUrl(input: string | URL | Location) {
    return new URL(input.toString())
}

function getHashParams(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return new URLSearchParams()

    const queryIndex = value.indexOf('?')
    return new URLSearchParams(queryIndex === -1 ? value : value.slice(queryIndex + 1))
}

function deleteParams(params: URLSearchParams, names: string[]) {
    let changed = false

    names.forEach((name) => {
        if (params.has(name)) {
            params.delete(name)
            changed = true
        }
    })

    return changed
}

function cleanHash(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return hash

    const queryIndex = value.indexOf('?')
    const params = getHashParams(hash)
    const changed = deleteParams(params, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])

    if (!changed) return hash

    const nextParams = params.toString()

    if (queryIndex === -1) {
        return nextParams ? `#${nextParams}` : ''
    }

    const hashPath = value.slice(0, queryIndex)
    return nextParams ? `#${hashPath}?${nextParams}` : `#${hashPath}`
}

export function getLicenseFromUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)
    const sources = [
        url.searchParams,
        getHashParams(url.hash),
    ]

    for (const params of sources) {
        for (const name of LICENSE_PARAM_NAMES) {
            const value = params.get(name)?.trim()
            if (value) return value
        }
    }

    return null
}

export function cleanLicenseReturnUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)

    deleteParams(url.searchParams, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])
    url.hash = cleanHash(url.hash)

    return url.toString()
}

export function scrubLicenseReturnUrl() {
    const nextUrl = cleanLicenseReturnUrl(window.location)

    if (nextUrl !== window.location.href) {
        window.history.replaceState(null, document.title, nextUrl)
    }
}

export function buildCheckoutReturnUrl(input: string | URL | Location = window.location) {
    const url = new URL(cleanLicenseReturnUrl(input))
    url.searchParams.set(CHECKOUT_RETURN_PARAM, '1')

    return url.toString()
}

export function buildProCheckoutUrl(
    checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URL,
    returnUrl: string | URL | Location = window.location,
) {
    const trimmedCheckoutUrl = checkoutUrl.trim()
    if (!trimmedCheckoutUrl) return null

    try {
        const url = new URL(trimmedCheckoutUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

        if (!url.searchParams.has('checkout[custom][source]')) {
            url.searchParams.set('checkout[custom][source]', CHECKOUT_SOURCE)
        }

        if (!url.searchParams.has('checkout[custom][return_url]')) {
            url.searchParams.set('checkout[custom][return_url]', buildCheckoutReturnUrl(returnUrl))
        }

        return url.toString()
    }
    catch {
        return null
    }
}

export function openProCheckout(checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URL) {
    const url = buildProCheckoutUrl(checkoutUrl)
    if (!url) return false

    window.open(url, '_blank', 'noopener,noreferrer')
    return true
}

export function maskLicense(license: string) {
    const trimmedLicense = license.trim()
    if (!trimmedLicense) return ''
    if (trimmedLicense.length <= 8) return '****'

    return `****-${trimmedLicense.slice(-4)}`
}
