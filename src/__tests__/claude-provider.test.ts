import { describe, expect, it } from 'vitest'
import { getClaudeChatIdFromUrl, processClaudeConversation, wrapClaudeConversation } from '../providers/claude'

describe('getClaudeChatIdFromUrl', () => {
    it('parses standard Claude chat URLs', () => {
        expect(getClaudeChatIdFromUrl('/chat/abc-123')).toBe('abc-123')
    })

    it('parses Claude project chat URLs', () => {
        expect(getClaudeChatIdFromUrl('/project/project-123/chat/chat-456')).toBe('chat-456')
    })
})

describe('processClaudeConversation', () => {
    it('maps Claude conversations into ConversationResult', () => {
        const result = processClaudeConversation({
            uuid: 'conv-1',
            name: 'Claude Export Test',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:02:00.000Z',
            current_model: 'claude-3-5-sonnet-20241022',
            chat_messages: [
                {
                    uuid: 'msg-1',
                    sender: 'human',
                    text: 'Hello Claude',
                    created_at: '2024-01-01T00:00:00.000Z',
                },
                {
                    uuid: 'msg-2',
                    sender: 'assistant',
                    content: [
                        { type: 'text', text: 'Hello human' },
                    ],
                    created_at: '2024-01-01T00:01:00.000Z',
                    model: 'claude-3-5-sonnet-20241022',
                },
            ],
        })

        expect(result.id).toBe('conv-1')
        expect(result.title).toBe('Claude Export Test')
        expect(result.modelSlug).toBe('claude-3-5-sonnet-20241022')
        expect(result.model).toBe('Claude 3.5 Sonnet')
        expect(result.createTime).toBe(1704067200)
        expect(result.updateTime).toBe(1704067320)
        expect(result.sourceUrl).toBe('https://claude.ai/chat/conv-1')
        expect(result.conversationNodes).toHaveLength(2)
        expect(result.conversationNodes[0].message?.author.role).toBe('user')
        expect(result.conversationNodes[0].message?.content).toEqual({
            content_type: 'text',
            parts: ['Hello Claude'],
        })
        expect(result.conversationNodes[1].message?.author.role).toBe('assistant')
        expect(result.conversationNodes[1].message?.author.name).toBe('Claude')
        expect(result.conversationNodes[1].message?.content).toEqual({
            content_type: 'text',
            parts: ['Hello human'],
        })
    })

    it('includes supported Claude content blocks and attachments', () => {
        const result = processClaudeConversation({
            uuid: 'conv-2',
            chat_messages: [
                {
                    uuid: 'msg-1',
                    sender: 'human',
                    content: [
                        { type: 'text', text: 'Read this file' },
                    ],
                    attachments: [
                        {
                            file_name: 'notes.txt',
                            extracted_content: 'file body',
                        },
                    ],
                },
                {
                    uuid: 'msg-2',
                    sender: 'assistant',
                    content: [
                        {
                            type: 'tool_use',
                            name: 'search',
                            input: { query: 'notes' },
                        },
                        {
                            type: 'tool_result',
                            content: 'found notes',
                        },
                        { type: 'text', text: 'Done' },
                    ],
                },
            ],
        })

        expect(result.conversationNodes[0].message?.content).toEqual({
            content_type: 'text',
            parts: ['Read this file\n\nAttachment: notes.txt\nfile body'],
        })
        expect(result.conversationNodes[1].message?.content.content_type).toBe('text')
        expect(result.conversationNodes[1].message?.content.parts[0]).toContain('Tool use: search')
        expect(result.conversationNodes[1].message?.content.parts[0]).toContain('Tool result:')
        expect(result.conversationNodes[1].message?.content.parts[0]).toContain('Done')
    })

    it('returns a wrapped conversation result unchanged', () => {
        const wrapped = wrapClaudeConversation({
            uuid: 'conv-3',
            name: 'Wrapped',
            chat_messages: [],
        })

        expect(processClaudeConversation(wrapped)).toBe(wrapped.conversation)
    })
})
