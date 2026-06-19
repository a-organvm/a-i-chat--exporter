import { getBase64FromImg } from '../utils/dom'
import type { ApiConversationWithId, AuthorRole, ConversationNode, ConversationNodeMessage } from '../api'
import type { Provider } from './types'

type GeminiRole = Extract<AuthorRole, 'assistant' | 'user'>

interface GeminiTurn {
    role: GeminiRole
    text: string
    timestamp?: number
}

const GEMINI_CURRENT_CHAT_ID = 'gemini-current'
const GEMINI_MODEL_SLUG = 'gemini'

const geminiDefaultAvatar = 'data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22none%22%20stroke-width%3D%221.5%22%20viewBox%3D%22-6%20-6%2036%2036%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20style%3D%22color%3A%20white%3B%20background%3A%20%234285f4%3B%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E'

export const geminiProvider: Provider = {
    id: 'gemini',
    name: 'Gemini',
    hosts: ['gemini.google.com'],
    features: {
        bulkExport: false,
        archive: false,
        delete: false,
        projects: false,
        timestamps: false,
        png: true,
    },
    getChatIdFromUrl: getGeminiChatIdFromUrl,
    getCurrentChatId: async () => getGeminiChatIdFromUrl() ?? GEMINI_CURRENT_CHAT_ID,
    fetchConversation: async (chatId: string, _shouldReplaceAssets: boolean) => {
        return getGeminiConversationFromPage(chatId)
    },
    fetchAllConversations: async () => [],
    fetchProjects: async () => [],
    archiveConversation: async () => false,
    deleteConversation: async () => false,
    checkIfConversationStarted: () => extractGeminiTurns(document).length > 0,
    getUserAvatar: getGeminiUserAvatar,
    getConversationSource: (id: string) => {
        if (id === GEMINI_CURRENT_CHAT_ID) return location.href
        return `${location.origin}/app/${id}`
    },
    getScreenshotTarget: () => {
        return document.querySelector<HTMLElement>('main')
            ?? document.querySelector<HTMLElement>('chat-window')
            ?? document.querySelector<HTMLElement>('infinite-scroller')
    },
    mountMenu: (getMenuContainer) => {
        const containerId = 'chatgpt-exporter-gemini-menu'

        const mount = () => {
            if (document.getElementById(containerId)) return

            const container = getMenuContainer()
            container.id = containerId
            container.style.position = 'fixed'
            container.style.left = '16px'
            container.style.bottom = '16px'
            container.style.zIndex = '2147483647'
            container.style.maxWidth = '316px'
            document.body.append(container)
        }

        mount()
        setInterval(mount, 300)
    },
}

export function getGeminiChatIdFromUrl(pathname = location.pathname): string | null {
    const match = pathname.match(/^\/app\/([a-z0-9_-]+)/i)
    return match?.[1] ?? null
}

export function getGeminiConversationFromPage(chatId = getGeminiChatIdFromUrl() ?? GEMINI_CURRENT_CHAT_ID): ApiConversationWithId {
    const now = Date.now() / 1000
    const turns = extractGeminiTurns(document)
    const createTime = turns.find(turn => turn.timestamp)?.timestamp ?? now
    const updateTime = [...turns].reverse().find(turn => turn.timestamp)?.timestamp ?? now
    const title = getGeminiTitle(turns)
    const mapping = buildConversationMapping(turns)
    const currentNode = turns.length > 0 ? `gemini-message-${turns.length - 1}` : 'gemini-root'

    return {
        id: chatId,
        title,
        create_time: createTime,
        update_time: updateTime,
        conversation_id: chatId,
        current_node: currentNode,
        mapping,
        moderation_results: [],
        is_archived: false,
    }
}

export function extractGeminiTurns(root: ParentNode): GeminiTurn[] {
    const nativeTurns = Array.from(root.querySelectorAll<HTMLElement>('user-query, model-response'))
    const turnElements = nativeTurns.length > 0
        ? nativeTurns
        : Array.from(root.querySelectorAll<HTMLElement>([
            '[data-message-author-role="user"]',
            '[data-message-author-role="assistant"]',
            '[data-testid="user-query"]',
            '[data-test-id="user-query"]',
            '[data-testid="model-response"]',
            '[data-test-id="model-response"]',
        ].join(',')))

    const turns: GeminiTurn[] = []
    turnElements.forEach((element) => {
        if (turnElements.some(candidate => candidate !== element && candidate.contains(element))) return

        const role = getTurnRole(element)
        if (!role) return

        const contentElement = getTurnContentElement(element, role)
        const text = elementToMarkdown(contentElement).trim()
        if (!text) return

        turns.push({
            role,
            text,
            timestamp: getTurnTimestamp(element),
        })
    })

    return turns
}

function buildConversationMapping(turns: GeminiTurn[]): Record<string, ConversationNode> {
    const mapping: Record<string, ConversationNode> = {
        'gemini-root': {
            id: 'gemini-root',
            children: turns.length > 0 ? ['gemini-message-0'] : [],
        },
    }

    turns.forEach((turn, index) => {
        const id = `gemini-message-${index}`
        const parent = index === 0 ? 'gemini-root' : `gemini-message-${index - 1}`
        const next = turns[index + 1] ? [`gemini-message-${index + 1}`] : []
        mapping[id] = {
            id,
            parent,
            children: next,
            message: createGeminiMessage(id, turn),
        }
    })

    return mapping
}

function createGeminiMessage(id: string, turn: GeminiTurn): ConversationNodeMessage {
    return {
        id,
        author: {
            role: turn.role,
            name: turn.role === 'assistant' ? 'Gemini' : undefined,
            metadata: {},
        },
        content: {
            content_type: 'text',
            parts: [turn.text],
        },
        create_time: turn.timestamp,
        update_time: turn.timestamp,
        metadata: {
            model_slug: turn.role === 'assistant' ? GEMINI_MODEL_SLUG : undefined,
        },
        recipient: 'all',
        status: 'finished_successfully',
        end_turn: true,
        weight: 1,
    }
}

function getTurnRole(element: HTMLElement): GeminiRole | null {
    const tagName = element.tagName.toLowerCase()
    const explicitRole = element.getAttribute('data-message-author-role')?.toLowerCase()
    const testId = [
        element.getAttribute('data-testid'),
        element.getAttribute('data-test-id'),
    ].filter(Boolean).join(' ').toLowerCase()

    if (tagName === 'user-query' || explicitRole === 'user' || testId.includes('user-query')) return 'user'
    if (tagName === 'model-response' || explicitRole === 'assistant' || testId.includes('model-response')) return 'assistant'
    return null
}

function getTurnContentElement(element: HTMLElement, role: GeminiRole): HTMLElement {
    const selectors = role === 'assistant'
        ? [
            'message-content .markdown',
            'message-content',
            '[id^="message-content"] .markdown',
            '[id^="message-content"]',
            '.markdown',
            '.model-response-text',
            '.response-content',
        ]
        : [
            '.query-text',
            '.query-content',
            '.user-query-text',
            '[data-testid="user-message"]',
            '[data-test-id="user-message"]',
        ]

    return selectors
        .map(selector => element.querySelector<HTMLElement>(selector))
        .find(candidate => candidate && getElementText(candidate).trim().length > 0)
        ?? element
}

function getTurnTimestamp(element: HTMLElement): number | undefined {
    const timeElement = element.querySelector<HTMLTimeElement>('time[datetime]')
    const datetime = timeElement?.dateTime || timeElement?.getAttribute('datetime')
    if (!datetime) return undefined

    const timestamp = Date.parse(datetime)
    if (Number.isNaN(timestamp)) return undefined
    return timestamp / 1000
}

function getGeminiTitle(turns: GeminiTurn[]): string {
    const title = document.title
        .replace(/\s*[-|]\s*Gemini.*$/i, '')
        .replace(/^Gemini\s*[-|]\s*/i, '')
        .trim()

    if (title && title.toLowerCase() !== 'gemini') return title

    const firstUserTurn = turns.find(turn => turn.role === 'user')
    if (firstUserTurn) return normalizeTitle(firstUserTurn.text)

    return 'Gemini Conversation'
}

function normalizeTitle(text: string): string {
    const title = text
        .replace(/!\[[^\]]*]\([^)]+\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    if (!title) return 'Gemini Conversation'
    return title.length > 80 ? `${title.slice(0, 77).trim()}...` : title
}

async function getGeminiUserAvatar(): Promise<string> {
    try {
        const avatar = Array.from(document.querySelectorAll<HTMLImageElement>([
            'button[aria-label*="Google Account"] img',
            'a[aria-label*="Google Account"] img',
            'img[alt*="profile" i]',
            'img[alt*="avatar" i]',
        ].join(','))).find(img => img.src && !img.src.startsWith('data:'))

        if (avatar) return getBase64FromImg(avatar)
    }
    catch (error) {
        console.error(error)
    }

    return geminiDefaultAvatar
}

function elementToMarkdown(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement
    clone.querySelectorAll([
        'button',
        'mat-icon',
        'svg',
        '[aria-hidden="true"]',
        '[role="toolbar"]',
        '[data-test-id*="action"]',
        '[data-testid*="action"]',
    ].join(',')).forEach(node => node.remove())

    const markdown = Array.from(clone.childNodes)
        .map(node => nodeToMarkdown(node))
        .join('')

    return normalizeMarkdown(markdown || getElementText(element))
}

function nodeToMarkdown(node: ChildNode, inPre = false): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? ''
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const children = () => Array.from(element.childNodes).map(child => nodeToMarkdown(child, inPre)).join('')

    switch (tagName) {
        case 'br':
            return '\n'
        case 'p':
        case 'div':
        case 'section':
        case 'article':
            return block(children())
        case 'h1':
            return heading(children(), 1)
        case 'h2':
            return heading(children(), 2)
        case 'h3':
            return heading(children(), 3)
        case 'h4':
            return heading(children(), 4)
        case 'h5':
            return heading(children(), 5)
        case 'h6':
            return heading(children(), 6)
        case 'pre':
            return codeBlock(element)
        case 'code':
            if (inPre) return element.textContent ?? ''
            return inlineCode(element.textContent ?? '')
        case 'strong':
        case 'b':
            return wrapInline(children(), '**')
        case 'em':
        case 'i':
            return wrapInline(children(), '*')
        case 'a':
            return linkMarkdown(element, children())
        case 'img':
            return imageMarkdown(element)
        case 'blockquote':
            return block(prefixLines(children(), '> '))
        case 'ul':
            return listMarkdown(element, false)
        case 'ol':
            return listMarkdown(element, true)
        case 'li':
            return children().trim()
        default:
            return children()
    }
}

function block(value: string): string {
    const normalized = normalizeMarkdown(value)
    return normalized ? `\n\n${normalized}\n\n` : ''
}

function heading(value: string, level: number): string {
    const normalized = normalizeMarkdown(value)
    return normalized ? `\n\n${'#'.repeat(level)} ${normalized}\n\n` : ''
}

function codeBlock(element: HTMLElement): string {
    const code = element.textContent?.replace(/\n+$/, '') ?? ''
    const codeElement = element.querySelector<HTMLElement>('code')
    const language = Array.from(codeElement?.classList ?? [])
        .find(className => className.startsWith('language-'))
        ?.replace('language-', '') ?? ''

    return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
}

function inlineCode(value: string): string {
    if (!value) return ''
    const fence = value.includes('`') ? '``' : '`'
    return `${fence}${value}${fence}`
}

function wrapInline(value: string, marker: string): string {
    const normalized = normalizeInline(value)
    return normalized ? `${marker}${normalized}${marker}` : ''
}

function linkMarkdown(element: HTMLElement, content: string): string {
    const text = normalizeInline(content) || normalizeInline(element.textContent ?? '')
    const href = element.getAttribute('href')
    if (!href || !text || href.startsWith('javascript:')) return text
    return `[${text}](${(element as HTMLAnchorElement).href || href})`
}

function imageMarkdown(element: HTMLElement): string {
    const src = element.getAttribute('src')
    if (!src) return ''
    const alt = element.getAttribute('alt') ?? 'image'
    return `![${alt}](${(element as HTMLImageElement).src || src})`
}

function listMarkdown(element: HTMLElement, ordered: boolean): string {
    const items = Array.from(element.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map((child, index) => {
            const marker = ordered ? `${index + 1}.` : '-'
            return `${marker} ${normalizeMarkdown(nodeToMarkdown(child)).replace(/\n/g, '\n  ')}`
        })
        .filter(item => item.trim().length > 2)

    return items.length > 0 ? `\n\n${items.join('\n')}\n\n` : ''
}

function prefixLines(value: string, prefix: string): string {
    return normalizeMarkdown(value)
        .split('\n')
        .map(line => `${prefix}${line}`)
        .join('\n')
}

function normalizeMarkdown(value: string): string {
    return value
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function normalizeInline(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
}

function getElementText(element: HTMLElement): string {
    return element.innerText ?? element.textContent ?? ''
}
