import { describe, it, expect } from 'vitest';
import { convertToTavern, convertToOoba } from '../utils/conversion';
import type { ConversationNode, ConversationResult } from '../api';

function makeNode(role: 'user' | 'assistant' | 'system' | 'tool', text: string, createTime?: number): ConversationNode {
  return {
    id: `node-${Math.random().toString(36).slice(2)}`,
    children: [],
    message: {
      id: `msg-${Math.random().toString(36).slice(2)}`,
      author: { role, metadata: {} },
      content: { content_type: 'text', parts: [text] },
      create_time: createTime,
      recipient: 'all',
      status: 'finished_successfully',
      weight: 1,
    },
  };
}

function makeConversation(nodes: ConversationNode[]): ConversationResult {
  return {
    id: 'conv-1',
    title: 'Test Conversation',
    modelSlug: 'gpt-4',
    model: 'GPT-4',
    createTime: 1704067200,
    updateTime: 1704067200,
    conversationNodes: nodes,
  };
}

describe('convertToTavern', () => {
  it('includes name header as first line', () => {
    const conv = makeConversation([makeNode('user', 'hello')]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    const header = JSON.parse(lines[0]);
    expect(header.user_name).toBe('You');
    expect(header.character_name).toBe('Assistant');
  });

  it('converts user message correctly', () => {
    const conv = makeConversation([makeNode('user', 'hello', 1000)]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    const msg = JSON.parse(lines[1]);
    expect(msg.name).toBe('You');
    expect(msg.is_user).toBe(true);
    expect(msg.is_name).toBe(false);
    expect(msg.mes).toBe('hello');
    expect(msg.send_date).toBe(1000);
    expect(msg.swipes).toEqual(['hello']);
    expect(msg.swipe_id).toBe(0);
  });

  it('converts assistant message correctly', () => {
    const conv = makeConversation([makeNode('assistant', 'hi there', 2000)]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    const msg = JSON.parse(lines[1]);
    expect(msg.name).toBe('Assistant');
    expect(msg.is_user).toBe(false);
    expect(msg.is_name).toBe(true);
    expect(msg.mes).toBe('hi there');
  });

  it('filters out nodes without text content_type', () => {
    const codeNode: ConversationNode = {
      id: 'code-node',
      children: [],
      message: {
        id: 'msg-code',
        author: { role: 'assistant', metadata: {} },
        content: { content_type: 'code', language: 'unknown', text: 'print(1)' },
        recipient: 'all',
        status: 'finished_successfully',
        weight: 1,
      },
    };
    const conv = makeConversation([codeNode, makeNode('user', 'hello')]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    // header + 1 valid message (code node filtered)
    expect(lines).toHaveLength(2);
  });

  it('filters out nodes without message', () => {
    const emptyNode: ConversationNode = { id: 'empty', children: [] };
    const conv = makeConversation([emptyNode, makeNode('user', 'hello')]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
  });

  it('handles conversation with multiple messages', () => {
    const conv = makeConversation([
      makeNode('user', 'question'),
      makeNode('assistant', 'answer'),
      makeNode('user', 'follow-up'),
    ]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    // header + 3 messages
    expect(lines).toHaveLength(4);
  });

  it('outputs valid JSONL format', () => {
    const conv = makeConversation([makeNode('user', 'hello'), makeNode('assistant', 'hi')]);
    const result = convertToTavern(conv);
    const lines = result.split('\n');
    lines.forEach(line => {
      expect(() => JSON.parse(line)).not.toThrow();
    });
  });
});

describe('convertToOoba', () => {
  it('pairs user/assistant messages', () => {
    const conv = makeConversation([
      makeNode('user', 'hello'),
      makeNode('assistant', 'hi'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal).toEqual([['hello', 'hi']]);
    expect(result.visible).toEqual([['hello', 'hi']]);
  });

  it('handles system message with non-empty text', () => {
    const conv = makeConversation([
      makeNode('system', 'You are helpful'),
      makeNode('user', 'hello'),
      makeNode('assistant', 'hi'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    // system message becomes visible-chat pair
    expect(result.internal[0]).toEqual(['<|BEGIN-VISIBLE-CHAT|>', 'You are helpful']);
    // visible version strips the marker
    expect(result.visible[0][0]).toBe('');
  });

  it('skips system message with empty text', () => {
    const conv = makeConversation([
      makeNode('system', ''),
      makeNode('user', 'hello'),
      makeNode('assistant', 'hi'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal).toEqual([['hello', 'hi']]);
  });

  it('handles consecutive user messages', () => {
    const conv = makeConversation([
      makeNode('user', 'first'),
      makeNode('user', 'second'),
      makeNode('assistant', 'response'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal[0]).toEqual(['first', '']);
    expect(result.internal[1]).toEqual(['second', 'response']);
  });

  it('handles standalone assistant message', () => {
    const conv = makeConversation([
      makeNode('assistant', 'unprompted'),
      makeNode('user', 'hello'),
      makeNode('assistant', 'hi'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal[0]).toEqual(['', 'unprompted']);
  });

  it('filters out tool messages', () => {
    const conv = makeConversation([
      makeNode('user', 'search for cats'),
      makeNode('tool', 'search results...'),
      makeNode('assistant', 'here are cats'),
    ]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal).toEqual([['search for cats', 'here are cats']]);
  });

  it('returns valid JSON with internal and visible keys', () => {
    const conv = makeConversation([makeNode('user', 'hi'), makeNode('assistant', 'hello')]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result).toHaveProperty('internal');
    expect(result).toHaveProperty('visible');
    expect(Array.isArray(result.internal)).toBe(true);
    expect(Array.isArray(result.visible)).toBe(true);
  });

  it('handles empty conversation', () => {
    const conv = makeConversation([]);
    const result = JSON.parse(convertToOoba(conv));
    expect(result.internal).toEqual([]);
    expect(result.visible).toEqual([]);
  });
});
