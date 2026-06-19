import type {
    ApiConversationItem,
    ConversationNode,
    ConversationNodeMessage,
    ConversationResult,
} from '../api'
import type { Provider } from './types'

const CLAUDE_ORIGIN = 'https://claude.ai'
const CLAUDE_DEFAULT_TITLE = 'Claude Conversation'

interface ClaudeOrganization {
    uuid?: string
    id?: string
    name?: string
    active?: boolean
}

interface ClaudeAttachment {
    file_name?: string
    filename?: string
    name?: string
    title?: string
    extracted_content?: string
    content?: unknown
    text?: string
}

interface ClaudeMessage {
    uuid?: string
    id?: string
    sender?: string
    author?: string
    role?: string
    text?: string
    content?: unknown
    attachments?: ClaudeAttachment[]
    files?: ClaudeAttachment[]
    created_at?: string | number
    updated_at?: string | number
    model?: string
}

interface ClaudeConversationListItem {
    uuid?: string
    id?: string
    name?: string
    title?: string
    summary?: string
    created_at?: string | number
    updated_at?: string | number
}

export interface ClaudeConversation {
    uuid?: string
    id?: string
    name?: string
    title?: string
    summary?: string
    created_at?: string | number
    updated_at?: string | number
    model?: string
    current_model?: string
    settings?: Record<string, unknown>
    project_uuid?: string
    project?: {
        uuid?: string
        id?: string
        name?: string
    }
    chat_messages?: ClaudeMessage[]
    messages?: ClaudeMessage[]
}

export interface ClaudeConversationExport {
    id: string
    provider: 'claude'
    rawConversation: ClaudeConversation
    conversation: ConversationResult
}

let cachedOrganizationId: string | null = null

export const claudeProvider: Provider<ClaudeConversationExport> = {
    id: 'claude',
    label: 'Claude',
    hosts: ['claude.ai'],
    getCurrentChatId: getCurrentClaudeChatId,
    fetchConversation: fetchClaudeConversation,
    processConversation: processClaudeConversation,
    checkIfConversationStarted: checkIfClaudeConversationStarted,
    fetchAllConversations: fetchAllClaudeConversations,
    fetchProjects: async () => [],
}

export function isClaudeConversationExport(value: unknown): value is ClaudeConversationExport {
    return isRecord(value)
        && value.provider === 'claude'
        && isRecord(value.rawConversation)
        && isRecord(value.conversation)
}

export function getClaudeChatIdFromUrl(pathname = globalThis.location?.pathname ?? ''): string | null {
    const projectMatch = pathname.match(/^\/project\/[^/]+\/chat\/([^/?#]+)/i)
    if (projectMatch) return decodeURIComponent(projectMatch[1])

    const chatMatch = pathname.match(/^\/chat\/([^/?#]+)/i)
    if (chatMatch) return decodeURIComponent(chatMatch[1])

    return null
}

async function getCurrentClaudeChatId(): Promise<string> {
    const chatId = getClaudeChatIdFromUrl()
    if (chatId) return chatId

    const conversations = await fetchAllClaudeConversations(null, 1)
    if (conversations.length > 0) return conversations[0].id

    throw new Error('No Claude chat id found.')
}

function checkIfClaudeConversationStarted() {
    if (getClaudeChatIdFromUrl()) return true
    if (typeof document === 'undefined') return false

    return !!document.querySelector([
        '[data-testid*="message"]',
        '[data-testid*="conversation"]',
        '[data-is-streaming]',
        'main [role="article"]',
    ].join(','))
}

async function fetchClaudeConversation(chatId: string, _shouldReplaceAssets: boolean): Promise<ClaudeConversationExport> {
    const organizationId = await getClaudeOrganizationId()
    const response = await fetchClaudeApi<unknown>(
        `/api/organizations/${encodeURIComponent(organizationId)}/chat_conversations/${encodeURIComponent(chatId)}`,
    )
    const conversation = normalizeClaudeConversationResponse(response)

    return wrapClaudeConversation(conversation, chatId)
}

export async function fetchAllClaudeConversations(_project: string | null = null, maxConversations = 1000): Promise<ApiConversationItem[]> {
    const organizationId = await getClaudeOrganizationId()
    const conversations: ApiConversationItem[] = []
    const limit = 50
    let offset = 0

    while (conversations.length < maxConversations) {
        const params = new URLSearchParams({
            limit: String(Math.min(limit, maxConversations - conversations.length)),
            offset: String(offset),
        })
        const response = await fetchClaudeApi<unknown>(
            `/api/organizations/${encodeURIComponent(organizationId)}/chat_conversations?${params.toString()}`,
        )
        const { items, total } = extractClaudeConversationList(response)

        conversations.push(...items.map(mapClaudeConversationItem))

        if (items.length === 0) break
        if (typeof total === 'number' && conversations.length >= total) break
        if (items.length < limit) break

        offset += items.length
    }

    return conversations.slice(0, maxConversations)
}

export function wrapClaudeConversation(conversation: ClaudeConversation, fallbackId?: string): ClaudeConversationExport {
    const result = processClaudeConversation(conversation, fallbackId)

    return {
        id: result.id,
        provider: 'claude',
        rawConversation: conversation,
        conversation: result,
    }
}

export function processClaudeConversation(
    conversationOrExport: ClaudeConversation | ClaudeConversationExport,
    fallbackId?: string,
): ConversationResult {
    if (isClaudeConversationExport(conversationOrExport)) {
        return conversationOrExport.conversation
    }

    const conversation = conversationOrExport
    const id = firstString(conversation.uuid, conversation.id, fallbackId) || 'claude-conversation'
    const chatMessages = arrayFrom(conversation.chat_messages)
    const messages = chatMessages.length > 0 ? chatMessages : arrayFrom(conversation.messages)
    const modelSlug = extractClaudeModelSlug(conversation, messages)
    const model = formatClaudeModel(modelSlug)
    const createTime = toUnixTime(conversation.created_at)
        || firstMessageTime(messages)
        || nowUnixTime()
    const updateTime = toUnixTime(conversation.updated_at)
        || lastMessageTime(messages)
        || createTime
    const title = firstString(conversation.name, conversation.title, conversation.summary)
        || deriveTitleFromMessages(messages)
        || CLAUDE_DEFAULT_TITLE
    const projectId = firstString(
        conversation.project_uuid,
        conversation.project?.uuid,
        conversation.project?.id,
        stringFromRecord(conversation.settings, 'project_uuid'),
        stringFromRecord(conversation.settings, 'project_id'),
    )
    const projectName = firstString(conversation.project?.name, stringFromRecord(conversation.settings, 'project_name'))
    const conversationNodes = mapClaudeMessages(messages, modelSlug)

    return {
        id,
        title,
        modelSlug,
        model,
        createTime,
        updateTime,
        conversationNodes,
        projectId,
        projectName,
        sourceUrl: buildClaudeSourceUrl(id, projectId),
    }
}

function mapClaudeMessages(messages: ClaudeMessage[], modelSlug: string): ConversationNode[] {
    const ids = messages.map((message, index) => getClaudeMessageId(message, index))

    return messages.map((message, index) => {
        const id = ids[index]
        const parent = ids[index - 1]
        const next = ids[index + 1]

        return {
            id,
            parent,
            children: next ? [next] : [],
            message: mapClaudeMessage(message, id, modelSlug),
        }
    })
}

function mapClaudeMessage(message: ClaudeMessage, id: string, modelSlug: string): ConversationNodeMessage {
    const role = mapClaudeRole(message.sender ?? message.author ?? message.role)
    const text = extractClaudeMessageText(message)
    const createTime = toUnixTime(message.created_at)
    const updateTime = toUnixTime(message.updated_at)

    return {
        id,
        author: {
            role,
            name: role === 'assistant' ? 'Claude' : undefined,
            metadata: {},
        },
        content: {
            content_type: 'text',
            parts: [text],
        },
        create_time: createTime || undefined,
        update_time: updateTime || undefined,
        metadata: {
            model_slug: firstString(message.model, modelSlug) || 'claude',
        },
        recipient: 'all',
        status: 'finished_successfully',
        end_turn: true,
        weight: 1,
    }
}

function extractClaudeMessageText(message: ClaudeMessage): string {
    const contentText = extractClaudeContentText(message.content)
    const text = contentText || message.text || ''
    const attachmentText = [
        ...arrayFrom(message.attachments),
        ...arrayFrom(message.files),
    ]
        .map(formatClaudeAttachment)
        .filter(nonEmpty)

    return [text, ...attachmentText].filter(nonEmpty).join('\n\n')
}

function extractClaudeContentText(content: unknown): string {
    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
        return content
            .map(formatClaudeContentBlock)
            .filter(nonEmpty)
            .join('\n\n')
    }

    if (isRecord(content)) {
        return formatClaudeContentBlock(content) ?? ''
    }

    return ''
}

function formatClaudeContentBlock(block: unknown): string | null {
    if (typeof block === 'string') return block
    if (!isRecord(block)) return null

    const type = typeof block.type === 'string' ? block.type : ''
    if (type === 'thinking') {
        return null
    }

    const text = firstString(
        stringFromRecord(block, 'text'),
        stringFromRecord(block, 'summary'),
        stringFromRecord(block, 'message'),
    )
    if (text) return text

    if (type === 'tool_use') {
        const name = firstString(stringFromRecord(block, 'name'), 'tool')
        return `Tool use: ${name}\n\`\`\`json\n${stringifyUnknown(block.input)}\n\`\`\``
    }

    if (type === 'tool_result') {
        return `Tool result:\n\`\`\`\n${stringifyUnknown(block.content)}\n\`\`\``
    }

    if (type === 'image') {
        return '[image]'
    }

    if ('content' in block) {
        return stringifyUnknown(block.content)
    }

    if ('source' in block) {
        return stringifyUnknown(block.source)
    }

    return null
}

function formatClaudeAttachment(attachment: ClaudeAttachment): string | null {
    const name = firstString(
        attachment.file_name,
        attachment.filename,
        attachment.name,
        attachment.title,
        'attachment',
    )
    const content = firstString(
        attachment.extracted_content,
        typeof attachment.content === 'string' ? attachment.content : undefined,
        attachment.text,
    )

    if (content) {
        return `Attachment: ${name}\n${content}`
    }

    return name === 'attachment' ? null : `Attachment: ${name}`
}

async function getClaudeOrganizationId(): Promise<string> {
    if (cachedOrganizationId) return cachedOrganizationId

    const pathOrganizationId = getClaudeOrganizationIdFromPath()
    if (pathOrganizationId) {
        cachedOrganizationId = pathOrganizationId
        return cachedOrganizationId
    }

    const response = await fetchClaudeApi<unknown>('/api/organizations')
    const organizations = normalizeClaudeOrganizations(response)
    const organization = organizations.find(item => item.active) ?? organizations[0]
    const organizationId = firstString(organization?.uuid, organization?.id)

    if (!organizationId) {
        throw new Error('No Claude organization id found.')
    }

    cachedOrganizationId = organizationId
    return cachedOrganizationId
}

function getClaudeOrganizationIdFromPath(pathname = globalThis.location?.pathname ?? ''): string | null {
    const match = pathname.match(/^\/organizations\/([^/]+)/i)
    if (match) return decodeURIComponent(match[1])
    return null
}

async function fetchClaudeApi<T>(path: string, options?: RequestInit): Promise<T> {
    const url = new URL(path, getClaudeOrigin())
    const headers = new Headers(options?.headers)
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json')
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
    })

    if (!response.ok) {
        throw new Error(response.statusText || `Claude API request failed: ${response.status}`)
    }

    return response.json()
}

function extractClaudeConversationList(response: unknown) {
    if (Array.isArray(response)) {
        return { items: response.filter(isRecord) as ClaudeConversationListItem[], total: null }
    }

    if (!isRecord(response)) {
        return { items: [], total: null }
    }

    const rawItems = firstArray(
        response.conversations,
        response.chat_conversations,
        response.items,
        response.data,
    )
    const total = typeof response.total === 'number'
        ? response.total
        : typeof response.count === 'number'
            ? response.count
            : null

    return {
        items: rawItems.filter(isRecord) as ClaudeConversationListItem[],
        total,
    }
}

function mapClaudeConversationItem(item: ClaudeConversationListItem): ApiConversationItem {
    const id = firstString(item.uuid, item.id) || 'claude-conversation'
    const title = firstString(item.name, item.title, item.summary) || CLAUDE_DEFAULT_TITLE

    return {
        id,
        title,
        create_time: toUnixTime(item.created_at) || 0,
    }
}

function normalizeClaudeOrganizations(response: unknown): ClaudeOrganization[] {
    if (Array.isArray(response)) return response.filter(isRecord) as ClaudeOrganization[]
    if (!isRecord(response)) return []
    if (stringFromRecord(response, 'uuid') || stringFromRecord(response, 'id')) return [response as ClaudeOrganization]

    return firstArray(response.organizations, response.items, response.data)
        .filter(isRecord) as ClaudeOrganization[]
}

function normalizeClaudeConversationResponse(response: unknown): ClaudeConversation {
    if (!isRecord(response)) {
        throw new Error('Invalid Claude conversation response.')
    }

    const nested = firstRecord(
        response.conversation,
        response.chat_conversation,
        response.data,
    )

    return (nested ?? response) as ClaudeConversation
}

function extractClaudeModelSlug(conversation: ClaudeConversation, messages: ClaudeMessage[]): string {
    return firstString(
        conversation.model,
        conversation.current_model,
        stringFromRecord(conversation.settings, 'model'),
        stringFromRecord(conversation.settings, 'current_model'),
        messages.find(message => message.model)?.model,
        'claude',
    ) || 'claude'
}

function formatClaudeModel(modelSlug: string): string {
    if (!modelSlug || modelSlug === 'claude') return 'Claude'

    const mappings: Array<[RegExp, string]> = [
        [/claude-?opus-?4-?1/i, 'Claude Opus 4.1'],
        [/claude-?opus-?4/i, 'Claude Opus 4'],
        [/claude-?sonnet-?4/i, 'Claude Sonnet 4'],
        [/claude-?3-?7-?sonnet/i, 'Claude 3.7 Sonnet'],
        [/claude-?3-?5-?sonnet/i, 'Claude 3.5 Sonnet'],
        [/claude-?3-?5-?haiku/i, 'Claude 3.5 Haiku'],
        [/claude-?3-?opus/i, 'Claude 3 Opus'],
        [/claude-?3-?sonnet/i, 'Claude 3 Sonnet'],
        [/claude-?3-?haiku/i, 'Claude 3 Haiku'],
    ]
    const match = mappings.find(([regex]) => regex.test(modelSlug))
    if (match) return match[1]

    return modelSlug
        .replace(/^claude[-_\s]*/i, 'Claude ')
        .replace(/[-_]20\d{6}$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function mapClaudeRole(role?: string): ConversationNodeMessage['author']['role'] {
    switch (role) {
        case 'human':
        case 'user':
            return 'user'
        case 'assistant':
        case 'claude':
            return 'assistant'
        case 'system':
            return 'system'
        case 'tool':
            return 'tool'
        default:
            return 'assistant'
    }
}

function getClaudeMessageId(message: ClaudeMessage, index: number) {
    return firstString(message.uuid, message.id) || `claude-message-${index}`
}

function deriveTitleFromMessages(messages: ClaudeMessage[]) {
    const firstUserMessage = messages.find(message => mapClaudeRole(message.sender ?? message.author ?? message.role) === 'user')
    const text = firstUserMessage ? extractClaudeMessageText(firstUserMessage).trim() : ''
    if (!text) return ''

    return text.split(/\s+/).slice(0, 10).join(' ')
}

function firstMessageTime(messages: ClaudeMessage[]) {
    return toUnixTime(messages[0]?.created_at)
}

function lastMessageTime(messages: ClaudeMessage[]) {
    return toUnixTime(messages[messages.length - 1]?.updated_at)
        || toUnixTime(messages[messages.length - 1]?.created_at)
}

function buildClaudeSourceUrl(id: string, projectId?: string) {
    const origin = getClaudeOrigin()
    if (projectId) return `${origin}/project/${encodeURIComponent(projectId)}/chat/${encodeURIComponent(id)}`
    return `${origin}/chat/${encodeURIComponent(id)}`
}

function getClaudeOrigin() {
    if (globalThis.location?.hostname === 'claude.ai') return globalThis.location.origin
    return CLAUDE_ORIGIN
}

function toUnixTime(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.floor(value > 100000000000 ? value / 1000 : value)
    }

    if (typeof value === 'string' && value) {
        const parsed = Date.parse(value)
        if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
    }

    return 0
}

function nowUnixTime() {
    return Math.floor(Date.now() / 1000)
}

function firstString(...values: Array<string | null | undefined>) {
    return values.find(value => typeof value === 'string' && value.length > 0)
}

function stringFromRecord(record: unknown, key: string) {
    if (!isRecord(record)) return undefined
    const value = record[key]
    return typeof value === 'string' ? value : undefined
}

function firstArray(...values: unknown[]) {
    return values.find(Array.isArray) ?? []
}

function firstRecord(...values: unknown[]) {
    return values.find(isRecord)
}

function arrayFrom<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function nonEmpty(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function stringifyUnknown(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === undefined || value === null) return ''

    try {
        return JSON.stringify(value, null, 2)
    }
    catch {
        return String(value)
    }
}
