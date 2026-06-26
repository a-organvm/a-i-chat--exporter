import urlcat from 'urlcat'
import { requireExporterApiAuth } from './auth'
import { apiUrl, baseUrl } from './constants'
import { getChatIdFromUrl, getConversationFromSharePage, getPageAccessToken, isSharePage } from './page'
import { blobToDataURL } from './utils/dom'
import { logger } from './utils/logger'
import { memorize } from './utils/memorize'
import { assertValidChatId, assertValidPagination, assertValidRequestUrl } from './utils/validation'

/**
 * Error thrown when a backend API request fails. Carries enough context
 * (status, url, method) for callers and logs to act on without leaking the
 * request body or auth headers.
 */
export class ApiError extends Error {
    readonly status: number
    readonly statusText: string
    readonly url: string
    readonly method: string

    constructor(message: string, init: { status: number; statusText: string; url: string; method: string }) {
        super(message)
        this.name = 'ApiError'
        this.status = init.status
        this.statusText = init.statusText
        this.url = init.url
        this.method = init.method
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
        || (isRecord(error) && 'name' in error && error.name === 'ApiError')
}

/** Redact ids/tokens from a url so it is safe to put in logs. */
function redactUrl(url: string): string {
    try {
        const parsed = new URL(url)
        // Redact any path segment that looks like an identifier (contains a
        // digit or is long) so conversation/file ids never reach the logs.
        const redactedPath = parsed.pathname
            .split('/')
            .map(segment => (segment.length >= 8 || /\d/.test(segment)) ? '<id>' : segment)
            .join('/')
        return `${parsed.origin}${redactedPath}`
    }
    catch {
        return '<unparseable-url>'
    }
}

type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type UnknownRecord = Record<string, unknown>

interface ApiSession {
    accessToken: string
}

type ModelSlug =
    | 'text-davinci-002-render-sha'
    | 'text-davinci-002-render-paid'
    | 'text-davinci-002-browse'
    | 'gpt-4'
    | 'gpt-4-browsing'
    | 'gpt-4o'

export interface Citation {
    start_ix: number
    end_ix: number
    citation_format_type: 'tether_og' & (string & {})
    metadata?: {
        extra?: {
            cited_message_idx: number
            evidence_text: string
        }
        text: string
        title: string
        type: 'webpage' & (string & {})
        url: string
    }
}

interface CiteMetadata {
    citation_format: {
        name: 'tether_og' & (string & {})
    }
    metadata_list: Array<{
        title: string
        url: string
        text: string
    }>
}

interface MessageMeta {
    aggregate_result?: {
        code: string
        final_expression_output?: string
        end_time: number
        jupyter_messages: JsonValue[]
        messages: Array<{
            image_url: string
            message_type: 'image'
            sender: 'server'
            time: number
            width: number
            height: number
        }>
        run_id: string
        start_time: number
        status: 'success' | 'error' & (string & {})
        update_time: number
    }
    args?: JsonValue
    command?: 'click' | 'search' | 'quote' | 'quote_lines' | 'scroll' & (string & {})
    finish_details?: {
        // stop: string
        stop_tokens?: number[]
        type: 'stop' | 'interrupted' & (string & {})
    }
    is_complete?: boolean
    model_slug?: ModelSlug & (string & {})
    parent_id?: string
    timestamp_?: 'absolute' & (string & {})
    citations?: Citation[]
    _cite_metadata?: CiteMetadata
}

export type AuthorRole = 'system' | 'assistant' | 'user' | 'tool'

interface MultiModalInputImage {
    /**
     * hack: this come from the api in the form of `file-service://file-base64`, but we replace it
     * automatically in the api wrapper with a data uri
     */
    asset_pointer: string
    content_type: 'image_asset_pointer' & (string & {})
    fovea: number
    height: number
    size_bytes: number
    width: number
    metadata?: {
        dalle?: {
            gen_id: string
            prompt: string
            seed: number
            serialization_title: string
        }
    }
}

interface MultiModalInputAudio {
    content_type: 'audio_asset_pointer'
    audio_asset_pointer: string
    expiry_datetime: string
    format: string
    metadata: {
        start_timestamp: number
        end_timestamp: number
        pretokenized_vq: null
    }
    size_bytes: number
}

interface MultiModalAudioVideoAssetPointer {
    content_type: 'real_time_user_audio_video_asset_pointer'
    expiry_datetime: string
    frames_asset_pointers: JsonValue[]
    video_container_asset_pointer: null
    audio_asset_pointer: {
        expiry_datetime: string
        content_type: 'audio_asset_pointer'
        asset_pointer: string
        size_bytes: number
        format: string
        metadata: {
            start_timestamp: null
            end_timestamp: null
            pretokenized_vq: null
            interruptions: null
            original_audio_source: null
            transcription: null
            word_transcription: null
            start: number
            end: number
        }
    }
    audio_start_timestamp: number
}

interface MultiModalAudioTranscription {
    content_type: 'audio_transcription'
    decoding_id: null
    direction: 'in' | 'out'
    text: string
}

export interface ConversationNodeMessage {
    author: {
        role: AuthorRole
        name?: 'browser' | 'python' & (string & {})
        metadata: JsonValue
    }
    content: {
        // chat response
        content_type: 'text'
        parts: string[]
    } | {
        // plugin response
        content_type: 'code'
        language: 'unknown' & (string & {})
        text: string
    } | {
        content_type: 'execution_output'
        text: string
    } | {
        content_type: 'user_editable_context'
        user_profile: string
        user_instructions: string
    } | {
        content_type: 'tether_quote'
        domain?: string
        text: string
        title: string
        url?: string
    } | {
        content_type: 'tether_browsing_code'
        // unknown
    } | {
        content_type: 'tether_browsing_display'
        result: string
        summary?: string
    } | {
        // multi-modal input
        content_type: 'multimodal_text'
        parts: Array<MultiModalAudioVideoAssetPointer | MultiModalAudioTranscription | MultiModalInputImage | MultiModalInputAudio | string>
    } | {
        content_type: 'model_editable_context'
        model_set_context: string
    }
    create_time?: number
    update_time?: number
    // end_turn: boolean
    id: string
    metadata?: MessageMeta
    recipient: 'all' | 'browser' | 'python' | 'dalle.text2im' & (string & {})
    status: string
    end_turn?: boolean
    weight: number
}

export interface ConversationNode {
    children: string[]
    id: string
    message?: ConversationNodeMessage
    parent?: string
}

type ConversationMapping = Record<string, ConversationNode>

export interface ApiConversation {
    create_time: number
    conversation_id?: string
    current_node: string
    mapping: ConversationMapping
    moderation_results: JsonValue[]
    title: string
    is_archived: boolean
    update_time: number
    safe_urls?: string[]
}

export type ApiConversationWithId = ApiConversation & {
    id: string
}

export interface ApiConversationItem {
    id: string
    title: string
    create_time: number
}

export interface ApiConversations {
    // what is this for?
    has_missing_conversations: boolean
    items: ApiConversationItem[]
    limit: number
    offset: number
    total: number | null
}

/// "Gizmos" are what OpenAI calls "projects" or other GPTs in the UI
export interface ApiGizmo {
    // weird nesting but ok
    gizmo: { gizmo: ApiProjectInfo }
    conversations: { itmes: ApiConversationItem[] }
}

export interface ApiProjectInfo {
    id: string
    organization_id: string
    display: { name: string; description: string }
    // todo: support exporting project context
}

interface ApiProjectsResponse {
    items: ApiGizmo[]
}

interface ApiProjectConversationsResponse {
    items: ApiConversationItem[]
    cursor?: number | null
}

interface ApiAccountsCheckAccount {
    account: {
        account_id: string | null
    }
}

interface ApiAccountsCheck {
    accounts: Record<string, ApiAccountsCheckAccount>
    account_ordering: string[]
}

type ApiFileDownload = {
    status: 'success'
    /** signed download url */
    download_url: string
    metadata: JsonObject
    file_name: string
    /** iso8601 datetime string */
    creation_time: string
} | {
    status: 'error'
    error_code: string
    error_message: string | null
}

const enum ChatGPTCookie {
    AgeVerification = 'oai-av-seen',
    AllowNonessential = 'oai-allow-ne',
    DeviceId = 'oai-did',
    DomainMigrationSourceCompleted = 'oai-dm-src-c-240329',
    DomainMigrationTargetCompleted = 'oai-dm-tgt-c-240329',
    HasClickedOnTryItFirstLink = 'oai-tif-20240402',
    HasLoggedInBefore = 'oai-hlib',
    HideLoggedOutBanner = 'hide-logged-out-banner',
    IntercomDeviceIdDev = 'intercom-device-id-izw1u7l7',
    IntercomDeviceIdProd = 'intercom-device-id-dgkjq2bp',
    IpOverride = 'oai-ip-country',
    IsEmployee = '_oaiauth',
    IsPaidUser = '_puid',
    LastLocation = 'oai-ll',
    SegmentUserId = 'ajs_user_id',
    SegmentUserTraits = 'ajs_user_traits',
    ShowPaymentModal = 'ui-show-payment-modal',
    TempEnableUnauthedCompliance = 'temp-oai-compliance',
    Workspace = '_account',
}

const sessionApi: string = urlcat(baseUrl, '/api/auth/session')
const conversationApi = (id: string): string => urlcat(apiUrl, '/conversation/:id', { id })
const conversationsApi = (offset: number, limit: number): string => urlcat(apiUrl, '/conversations', { offset, limit })
const fileDownloadApi = (id: string): string => urlcat(apiUrl, '/files/:id/download', { id })
const projectsApi = (): string => urlcat(apiUrl, '/gizmos/snorlax/sidebar', { conversations_per_gizmo: 0 })
const projectConversationsApi = (gizmo: string, offset: number, limit: number): string => urlcat(apiUrl, '/gizmos/:gizmo/conversations', { gizmo, cursor: offset, limit })
const accountsCheckApi: string = urlcat(apiUrl, '/accounts/check/v4-2023-04-27')

export async function getCurrentChatId(): Promise<string> {
    if (isSharePage()) {
        return `__share__${getChatIdFromUrl()}`
    }

    const chatId = getChatIdFromUrl()
    if (chatId) return chatId

    const conversations = await fetchConversations()
    if (conversations && conversations.items.length > 0) {
        return conversations.items[0].id
    }

    throw new Error('No chat id found.')
}

async function fetchImageFromPointer(uri: string): Promise<string | null> {
    const pointer = uri.replace('file-service://', '')
    const imageDetails = await fetchApi(fileDownloadApi(pointer), isApiFileDownload)
    if (imageDetails.status === 'error') {
        logger.error('Failed to fetch image asset', {
            errorCode: imageDetails.error_code,
            errorMessage: imageDetails.error_message,
        })
        return null
    }

    const image = await fetch(imageDetails.download_url)
    const blob = await image.blob()
    const base64 = await blobToDataURL(blob)
    const contentType = (image.headers.get('content-type') ?? blob.type) || 'application/octet-stream'
    return base64.replace(/^data:.*?;/, `data:${contentType};`)
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonValue(value: unknown): value is JsonValue {
    if (value === null) return true

    switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
            return true
        case 'object':
            if (Array.isArray(value)) return value.every(isJsonValue)
            return isJsonObject(value)
        default:
            return false
    }
}

function isJsonObject(value: unknown): value is JsonObject {
    return isRecord(value) && Object.values(value).every(isJsonValue)
}

function isFileServiceImageAssetPointer(part: unknown): part is MultiModalInputImage {
    return isRecord(part)
        && part.content_type === 'image_asset_pointer'
        && typeof part.asset_pointer === 'string'
        && part.asset_pointer.startsWith('file-service://')
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isApiFileDownload(value: unknown): value is ApiFileDownload {
    if (!isRecord(value) || typeof value.status !== 'string') return false
    if (value.status === 'success') {
        return typeof value.download_url === 'string'
            && typeof value.file_name === 'string'
            && isJsonObject(value.metadata)
            && isNonEmptyString(value.creation_time)
    }
    if (value.status === 'error') {
        return typeof value.error_code === 'string'
            && (value.error_message === null || typeof value.error_message === 'string')
    }
    return false
}

function isApiConversationItem(value: unknown): value is ApiConversationItem {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.title === 'string'
        && typeof value.create_time === 'number'
}

function isApiConversations(value: unknown): value is ApiConversations {
    return isRecord(value)
        && typeof value.has_missing_conversations === 'boolean'
        && typeof value.limit === 'number'
        && typeof value.offset === 'number'
        && (value.total === null || typeof value.total === 'number')
        && Array.isArray(value.items)
        && value.items.every(isApiConversationItem)
}

function isApiConversation(value: unknown): value is ApiConversation {
    return isRecord(value)
        && typeof value.create_time === 'number'
        && typeof value.current_node === 'string'
        && isRecord(value.mapping)
        && Array.isArray(value.moderation_results)
        && typeof value.title === 'string'
        && typeof value.is_archived === 'boolean'
        && typeof value.update_time === 'number'
}

function isApiProjectConversations(value: unknown): value is ApiProjectConversationsResponse {
    return isRecord(value)
        && Array.isArray(value.items)
        && (value.cursor === undefined || value.cursor === null || typeof value.cursor === 'number')
        && value.items.every(isApiConversationItem)
}

function isApiProjectsResponse(value: unknown): value is ApiProjectsResponse {
    return isRecord(value)
        && Array.isArray(value.items)
        && value.items.every(isApiGizmo)
}

function isApiGizmo(value: unknown): value is ApiGizmo {
    return isRecord(value)
        && isRecord(value.gizmo)
        && isRecord(value.gizmo.gizmo)
        && typeof value.gizmo.gizmo.id === 'string'
        && typeof value.gizmo.gizmo.organization_id === 'string'
        && isRecord(value.gizmo.gizmo.display)
        && typeof value.gizmo.gizmo.display.name === 'string'
        && typeof value.gizmo.gizmo.display.description === 'string'
}

function isApiSession(value: unknown): value is ApiSession {
    return isRecord(value)
        && typeof value.accessToken === 'string'
}

function isApiAccountsCheckAccount(value: unknown): value is ApiAccountsCheckAccount {
    return isRecord(value)
        && isRecord(value.account)
        && (value.account.account_id === null || typeof value.account.account_id === 'string')
}

function isApiAccountsCheck(value: unknown): value is ApiAccountsCheck {
    return isRecord(value)
        && isRecord(value.accounts)
        && Object.values(value.accounts).every(isApiAccountsCheckAccount)
        && isStringArray(value.account_ordering)
}

type ApiSuccessResponse = {
    success: boolean
}

function isApiSuccessResponse(value: unknown): value is ApiSuccessResponse {
    return isRecord(value) && typeof value.success === 'boolean'
}

/** replaces `file-service://` pointers with data uris containing the image */
/** avoid errors in parsing multimodal parts we don't understand */
async function replaceImageAssets(conversation: ApiConversation): Promise<void> {
    const imageAssets = Object.values(conversation.mapping).flatMap((node) => {
        if (!node.message) return []
        if (node.message.content.content_type !== 'multimodal_text') return []

        return (Array.isArray(node.message.content.parts) ? node.message.content.parts : [])
            .filter(isFileServiceImageAssetPointer)
    })

    const executionOutputs = Object.values(conversation.mapping).flatMap((node) => {
        if (!node.message) return []
        if (node.message.content.content_type !== 'execution_output') return []
        if (!node.message.metadata?.aggregate_result?.messages) return []

        return node.message.metadata.aggregate_result.messages
            .filter(msg => msg.message_type === 'image')
    })

    await Promise.all([
        ...imageAssets.map(async (asset) => {
            try {
                const newAssetPointer = await fetchImageFromPointer(asset.asset_pointer)
                if (newAssetPointer) asset.asset_pointer = newAssetPointer
            }
            catch (error) {
                logger.error('Failed to fetch image asset', { error })
            }
        }),
        ...executionOutputs.map(async (msg) => {
            try {
                const newImageUrl = await fetchImageFromPointer(msg.image_url)
                if (newImageUrl) msg.image_url = newImageUrl
            }
            catch (error) {
                logger.error('Failed to fetch image asset', { error })
            }
        }),
    ])
}

export async function fetchConversation(chatId: string, shouldReplaceAssets: boolean): Promise<ApiConversationWithId> {
    await requireExporterApiAuth()

    const validChatId = assertValidChatId(chatId)

    if (validChatId.startsWith('__share__')) {
        const id = validChatId.replace('__share__', '')
        const shareConversation = getConversationFromSharePage()
        if (!shareConversation) {
            throw new Error('Failed to read shared conversation from the page.')
        }
        await replaceImageAssets(shareConversation)

        return {
            id,
            ...shareConversation,
        }
    }

    const url = conversationApi(validChatId)
    const conversation = await fetchApi(url, isApiConversation)

    if (shouldReplaceAssets) {
        await replaceImageAssets(conversation)
    }

    return {
        id: validChatId,
        ...conversation,
    }
}

export async function fetchProjects(): Promise<ApiProjectInfo[]> {
    await requireExporterApiAuth()

    const url = projectsApi()
    const { items } = await fetchApi(url, isApiProjectsResponse)
    return items.map(gizmo => (gizmo.gizmo.gizmo))
}

async function fetchConversations(offset = 0, limit = 20, project: string | null = null): Promise<ApiConversations> {
    if (project) {
        return fetchProjectConversations(project, offset, limit)
    }
    assertValidPagination(offset, limit)
    const url = conversationsApi(offset, limit)
    return fetchApi(url, isApiConversations)
}

async function fetchProjectConversations(project: string, offset = 0, limit = 20): Promise<ApiConversations> {
    assertValidChatId(project, 'project')
    assertValidPagination(offset, limit)
    const url = projectConversationsApi(project, offset, limit)
    const { items } = await fetchApi(url, isApiProjectConversations)
    return {
        has_missing_conversations: false,
        items,
        limit,
        offset,
        total: null,
    }
}

export async function fetchAllConversations(project: string | null = null, maxConversations = 1000): Promise<ApiConversationItem[]> {
    await requireExporterApiAuth()

    if (!Number.isInteger(maxConversations) || maxConversations <= 0) {
        throw new Error(`maxConversations must be a positive integer, received ${maxConversations}.`)
    }

    const conversations: ApiConversationItem[] = []
    const limit = project === null ? 100 : 50 // gizmos api uses a smaller limit
    let offset = 0
    while (true) {
        try {
            const result = project === null
                ? await fetchConversations(offset, limit)
                : await fetchProjectConversations(project, offset, limit)
            if (!result.items) {
                // Handle potential API errors or empty responses
                logger.warn('fetchAllConversations received no items', { offset, project })
                break
            }
            conversations.push(...result.items)
            if (result.items.length === 0) break
            // Stop if we've reached the total reported by the API OR the user-defined limit
            if (result.total !== null && offset + limit >= result.total) break
            if (conversations.length >= maxConversations) break
            offset += limit
        }
        catch (error) {
            logger.error('Error fetching conversations batch', { offset, project, error })
            break
        }
    }
    // Ensure we don't return more than the requested limit if the last batch pushed us over
    return conversations.slice(0, maxConversations)
}

export async function archiveConversation(chatId: string): Promise<boolean> {
    await requireExporterApiAuth()

    const url = conversationApi(assertValidChatId(chatId))
    const { success } = await fetchApi(url, isApiSuccessResponse, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
    })
    return success
}

export async function deleteConversation(chatId: string): Promise<boolean> {
    await requireExporterApiAuth()

    const url = conversationApi(assertValidChatId(chatId))
    const { success } = await fetchApi(url, isApiSuccessResponse, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: false }),
    })
    return success
}

type ApiResponseValidator<T> = (value: unknown) => value is T

async function fetchApi<T>(
    url: string,
    validate: ApiResponseValidator<T>,
    options?: RequestInit,
): Promise<T> {
    await requireExporterApiAuth()

    assertValidRequestUrl(url, 'backend API url')
    const method = options?.method ?? 'GET'
    const safeUrl = redactUrl(url)

    const accessToken = await getAccessToken()
    const accountId = await getTeamAccountId()

    logger.debug('API request', { method, url: safeUrl })

    let response: Response
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Authorization': `Bearer ${accessToken}`,
                ...(accountId ? { 'Chatgpt-Account-Id': accountId } : {}),
                ...options?.headers,
            },
        })
    }
    catch (error) {
        // Network-level failure (offline, CORS, DNS). Surface as a typed error.
        logger.error('API request failed (network)', { method, url: safeUrl, error })
        throw new ApiError('Network request failed.', { status: 0, statusText: 'Network Error', url: safeUrl, method })
    }

    if (!response.ok) {
        logger.error('API request returned an error status', {
            method,
            url: safeUrl,
            status: response.status,
            statusText: response.statusText,
        })
        throw new ApiError(
            `Request failed with status ${response.status} ${response.statusText}`.trim(),
            { status: response.status, statusText: response.statusText, url: safeUrl, method },
        )
    }

    try {
        const payload: unknown = await response.json()
        if (!validate(payload)) {
            logger.error('API response had unexpected shape', { method, url: safeUrl })
            throw new ApiError('API response had an unexpected shape.', {
                status: response.status,
                statusText: response.statusText,
                url: safeUrl,
                method,
            })
        }
        return payload
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        logger.error('API response was not valid JSON', { method, url: safeUrl, error })
        throw new ApiError('Response was not valid JSON.', {
            status: response.status,
            statusText: response.statusText,
            url: safeUrl,
            method,
        })
    }
}

async function parseResponsePayload<T>(
    response: Response,
    validate: ApiResponseValidator<T>,
    label: string,
    method = 'GET',
): Promise<T> {
    try {
        const payload: unknown = await response.json()
        if (!validate(payload)) {
            logger.error('Response payload failed schema check', {
                label,
                status: response.status,
                statusText: response.statusText,
                url: redactUrl(response.url),
            })
            throw new ApiError('Response did not match expected schema.', {
                status: response.status,
                statusText: response.statusText,
                url: redactUrl(response.url),
                method,
            })
        }
        return payload
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError('Response was not valid JSON.', {
            status: response.status,
            statusText: response.statusText,
            url: redactUrl(response.url),
            method,
        })
    }
}

async function _fetchSession(): Promise<ApiSession> {
    assertValidRequestUrl(sessionApi, 'session url')

    let response: Response
    try {
        response = await fetch(sessionApi)
    }
    catch (error) {
        logger.error('Session request failed (network)', { error })
        throw new ApiError('Network request failed.', {
            status: 0,
            statusText: 'Network Error',
            url: redactUrl(sessionApi),
            method: 'GET',
        })
    }

    if (!response.ok) {
        throw new ApiError(
            `Session request failed with status ${response.status} ${response.statusText}`.trim(),
            { status: response.status, statusText: response.statusText, url: redactUrl(sessionApi), method: 'GET' },
        )
    }

    try {
        return await parseResponsePayload(response, isApiSession, 'session')
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        logger.error('Session response was not valid JSON', { error })
        throw new ApiError('Session response was not valid JSON.', {
            status: response.status,
            statusText: response.statusText,
            url: redactUrl(sessionApi),
            method: 'GET',
        })
    }
}

const fetchSession = memorize(_fetchSession)

async function getAccessToken(): Promise<string> {
    const pageAccessToken = getPageAccessToken()
    if (pageAccessToken) return pageAccessToken

    const session = await fetchSession()
    return session.accessToken
}

async function _fetchAccountsCheck(): Promise<ApiAccountsCheck> {
    assertValidRequestUrl(accountsCheckApi, 'accounts check url')
    const accessToken = await getAccessToken()

    let response: Response
    try {
        response = await fetch(accountsCheckApi, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Authorization': `Bearer ${accessToken}`,
            },
        })
    }
    catch (error) {
        logger.error('Accounts check request failed (network)', { error })
        throw new ApiError('Network request failed.', {
            status: 0,
            statusText: 'Network Error',
            url: redactUrl(accountsCheckApi),
            method: 'GET',
        })
    }

    if (!response.ok) {
        throw new ApiError(
            `Accounts check failed with status ${response.status} ${response.statusText}`.trim(),
            { status: response.status, statusText: response.statusText, url: redactUrl(accountsCheckApi), method: 'GET' },
        )
    }

    try {
        return await parseResponsePayload(response, isApiAccountsCheck, 'accounts check')
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        logger.error('Accounts check response was not valid JSON', { error })
        throw new ApiError('Accounts check response was not valid JSON.', {
            status: response.status,
            statusText: response.statusText,
            url: redactUrl(accountsCheckApi),
            method: 'GET',
        })
    }
}

const fetchAccountsCheck = memorize(_fetchAccountsCheck)

const getCookie = (key: ChatGPTCookie): string => document.cookie.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop() || ''

export async function getTeamAccountId(): Promise<string | null> {
    const accountsCheck = await fetchAccountsCheck()
    const workspaceId = getCookie(ChatGPTCookie.Workspace)
    if (workspaceId) {
        const account = accountsCheck.accounts[workspaceId]
        if (account) {
            return account.account.account_id
        }
    }

    return null
}

export interface ConversationResult {
    id: string
    title: string
    modelSlug: string
    model: string
    createTime: number
    updateTime: number
    conversationNodes: ConversationNode[]
    projectName?: string
    projectId?: string
}

const ModelMapping: { [key in ModelSlug]: string } & { [key: string]: string } = {
    'text-davinci-002-render-sha': 'GPT-3.5',
    'text-davinci-002-render-paid': 'GPT-3.5',
    'text-davinci-002-browse': 'GPT-3.5',
    'gpt-4': 'GPT-4',
    'gpt-4-browsing': 'GPT-4 (Browser)',
    'gpt-4o': 'GPT-4o',

    // fuzzy matching
    'text-davinci-002': 'GPT-3.5',
}

export function processConversation(conversation: ApiConversationWithId): ConversationResult {
    const title = conversation.title || 'ChatGPT Conversation'
    const createTime = conversation.create_time
    const updateTime = conversation.update_time
    const { model, modelSlug } = extractModel(conversation.mapping)

    const startNodeId = conversation.current_node
        || Object.values(conversation.mapping).find(node => !node.children || node.children.length === 0)?.id
    if (!startNodeId) throw new Error('Failed to find start node.')

    const conversationNodes = extractConversationResult(conversation.mapping, startNodeId)
    const mergedConversationNodes = mergeContinuationNodes(conversationNodes)

    return {
        id: conversation.id,
        title,
        model,
        modelSlug,
        createTime,
        updateTime,
        conversationNodes: mergedConversationNodes,
    }
}

interface ModelInfo {
    model: string
    modelSlug: string
}

function extractModel(conversationMapping: ConversationMapping): ModelInfo {
    let model = ''
    const modelSlug = Object.values(conversationMapping).find(node => node.message?.metadata?.model_slug)?.message?.metadata?.model_slug || ''
    if (modelSlug) {
        if (ModelMapping[modelSlug]) {
            model = ModelMapping[modelSlug]
        }
        else {
            Object.keys(ModelMapping).forEach((key) => {
                if (modelSlug.startsWith(key)) {
                    model = key
                }
            })
        }
    }

    return {
        model,
        modelSlug,
    }
}

function extractConversationResult(conversationMapping: ConversationMapping, startNodeId: string): ConversationNode[] {
    const result: ConversationNode[] = []
    let currentNodeId: string | undefined = startNodeId

    while (currentNodeId) {
        const node: ConversationNode = conversationMapping[currentNodeId]
        if (!node) {
            break // Node not found
        }

        if (node.parent === undefined) {
            break // Stop at root message.
        }

        if (
            // Skip system messages
            node.message?.author.role !== 'system'
            // Skip model memory context
            && node.message?.content.content_type !== 'model_editable_context'
            // Skip user custom instructions
            && node.message?.content.content_type !== 'user_editable_context'
        ) {
            result.unshift(node)
        }

        currentNodeId = node.parent
    }

    return result
}

/**
 * Merge continuation nodes generated by official continuation
 * to improve the readability of the conversation. (#146)
 */
function mergeContinuationNodes(nodes: ConversationNode[]): ConversationNode[] {
    const result: ConversationNode[] = []
    for (const node of nodes) {
        const prevNode = result[result.length - 1]
        if (
            prevNode?.message?.author.role === 'assistant' && node.message?.author.role === 'assistant'
         && prevNode.message.recipient === 'all' && node.message.recipient === 'all'
         && prevNode.message.content.content_type === 'text' && node.message.content.content_type === 'text'
        ) {
            // the last part of the previous node should directly concat to the first part of the current node
            prevNode.message.content.parts[prevNode.message.content.parts.length - 1] += node.message.content.parts[0]
            prevNode.message.content.parts.push(...node.message.content.parts.slice(1))
        }
        else {
            result.push(node)
        }
    }
    return result
}
