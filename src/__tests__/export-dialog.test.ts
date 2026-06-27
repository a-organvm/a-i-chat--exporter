import { describe, expect, it, vi } from 'vitest'
import {
    EXPORT_ALL_OPTIONS,
    createApiExportRequests,
    exportSelectedLocalConversations,
    findExportAllOption,
    getSelectedLocalConversations,
    isBulkExportDisabled,
    parseLocalConversationsUpload,
    shouldFetchConversationWithHistory,
} from '../ui/ExportDialog'
import type { ApiConversationItem, ApiConversationWithId } from '../api'
import type { ExportMeta } from '../ui/SettingContext'

function makeConversation(id: string, title = `Conversation ${id}`): ApiConversationWithId {
    return {
        id,
        title,
        create_time: 1704067200,
        update_time: 1704153600,
        current_node: `${id}-root`,
        mapping: {
            [`${id}-root`]: {
                id: `${id}-root`,
                children: [],
            },
        },
        moderation_results: [],
        is_archived: false,
    }
}

function makeItem(id: string, title = `Conversation ${id}`): ApiConversationItem {
    return {
        id,
        title,
        create_time: 1704067200,
    }
}

describe('ExportDialog bulk export helpers', () => {
    it('keeps export actions enabled only when every gate is clear', () => {
        const ready = {
            bulkExportAllowed: true,
            loading: false,
            processing: false,
            error: '',
            selectedCount: 1,
        }

        expect(isBulkExportDisabled(ready)).toBe(false)
        expect(isBulkExportDisabled({ ...ready, bulkExportAllowed: false })).toBe(true)
        expect(isBulkExportDisabled({ ...ready, loading: true })).toBe(true)
        expect(isBulkExportDisabled({ ...ready, processing: true })).toBe(true)
        expect(isBulkExportDisabled({ ...ready, error: 'failed' })).toBe(true)
        expect(isBulkExportDisabled({ ...ready, selectedCount: 0 })).toBe(true)
    })

    it('parses official local export uploads without accepting non-array JSON', () => {
        const conversations = [
            makeConversation('conversation-a'),
            makeConversation('conversation-b'),
        ]

        expect(parseLocalConversationsUpload(JSON.stringify(conversations))).toEqual(conversations)
        expect(parseLocalConversationsUpload(JSON.stringify({ conversations }))).toBeNull()
        expect(() => parseLocalConversationsUpload('{not-json')).toThrow(SyntaxError)
    })

    it('selects local conversations by id while preserving local file order', () => {
        const localConversations = [
            makeConversation('conversation-a'),
            makeConversation('conversation-b'),
            makeConversation('conversation-c'),
        ]
        const selected = [
            makeItem('conversation-c'),
            makeItem('missing-conversation'),
            makeItem('conversation-a'),
        ]

        expect(getSelectedLocalConversations(localConversations, selected).map(c => c.id)).toEqual([
            'conversation-a',
            'conversation-c',
        ])
    })

    it('dispatches selected local conversations to the matching exporter callback', () => {
        const callback = vi.fn()
        const metaList: ExportMeta[] = [{ name: 'source', value: '{source}' }]
        const localConversations = [
            makeConversation('conversation-a'),
            makeConversation('conversation-b'),
        ]

        expect(exportSelectedLocalConversations({
            disabled: false,
            localConversations,
            selected: [makeItem('conversation-b')],
            exportType: 'Custom',
            format: 'ChatGPT-{title}',
            metaList,
            exportOptions: [{ label: 'Custom', callback }],
        })).toBe(true)

        expect(callback).toHaveBeenCalledWith('ChatGPT-{title}', [localConversations[1]], metaList)
    })

    it('does not dispatch local exports when disabled or when the option is unknown', () => {
        const callback = vi.fn()
        const localConversations = [makeConversation('conversation-a')]

        expect(exportSelectedLocalConversations({
            disabled: true,
            localConversations,
            selected: [makeItem('conversation-a')],
            exportType: 'Custom',
            format: '{title}',
            metaList: [],
            exportOptions: [{ label: 'Custom', callback }],
        })).toBe(false)

        expect(exportSelectedLocalConversations({
            disabled: false,
            localConversations,
            selected: [makeItem('conversation-a')],
            exportType: 'Missing',
            format: '{title}',
            metaList: [],
            exportOptions: [{ label: 'Custom', callback }],
        })).toBe(false)

        expect(callback).not.toHaveBeenCalled()
    })

    it('builds API export requests with the right asset-replacement mode', async () => {
        const fetchConversation = vi.fn(async (id: string, shouldReplaceAssets: boolean) => (
            makeConversation(`${id}-${shouldReplaceAssets ? 'with-assets' : 'raw'}`)
        ))
        const selected = [
            makeItem('conversation-a', 'First'),
            makeItem('conversation-b', 'Second'),
        ]

        const jsonRequests = createApiExportRequests(selected, 'JSON', fetchConversation)
        expect(jsonRequests.map(request => request.name)).toEqual(['First', 'Second'])
        await expect(jsonRequests[0].request()).resolves.toMatchObject({ id: 'conversation-a-raw' })
        expect(fetchConversation).toHaveBeenCalledWith('conversation-a', false)

        const markdownRequests = createApiExportRequests([selected[1]], 'Markdown', fetchConversation)
        await expect(markdownRequests[0].request()).resolves.toMatchObject({ id: 'conversation-b-with-assets' })
        expect(fetchConversation).toHaveBeenCalledWith('conversation-b', true)
    })

    it('keeps the built-in export option labels and callback lookup stable', () => {
        expect(EXPORT_ALL_OPTIONS.map(option => option.label)).toEqual([
            'Markdown',
            'HTML',
            'JSON',
            'JSON (ZIP)',
        ])
        expect(findExportAllOption('JSON')?.label).toBe('JSON')
        expect(findExportAllOption('Missing')).toBeUndefined()
        expect(shouldFetchConversationWithHistory('JSON')).toBe(false)
        expect(shouldFetchConversationWithHistory('JSON (ZIP)')).toBe(true)
    })
})
