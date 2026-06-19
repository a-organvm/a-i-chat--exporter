import { describe, expect, it } from 'vitest';
import { processConversation } from '../api';
import type { ApiConversationWithId, ConversationNode, ConversationNodeMessage } from '../api';

type MessageOptions = {
  id?: string;
  metadata?: ConversationNodeMessage['metadata'];
  recipient?: ConversationNodeMessage['recipient'];
};

function makeMessage(
  role: ConversationNodeMessage['author']['role'],
  content: ConversationNodeMessage['content'],
  options: MessageOptions = {},
): ConversationNodeMessage {
  return {
    id: options.id ?? `${role}-message`,
    author: { role, metadata: {} },
    content,
    metadata: options.metadata,
    recipient: options.recipient ?? 'all',
    status: 'finished_successfully',
    weight: 1,
  };
}

function textMessage(
  role: ConversationNodeMessage['author']['role'],
  parts: string[],
  options?: MessageOptions,
): ConversationNodeMessage {
  return makeMessage(role, { content_type: 'text', parts }, options);
}

function makeNode(
  id: string,
  parent: string | undefined,
  children: string[],
  message?: ConversationNodeMessage,
): ConversationNode {
  return { id, parent, children, message };
}

function makeConversation(
  mapping: Record<string, ConversationNode>,
  currentNode: string,
  title = 'A conversation',
): ApiConversationWithId {
  return {
    id: 'conversation-1',
    title,
    create_time: 1704067200,
    update_time: 1704153600,
    current_node: currentNode,
    mapping,
    moderation_results: [],
    is_archived: false,
  };
}

describe('processConversation', () => {
  it('walks the active branch, skips hidden context, extracts the model, and merges assistant continuations', () => {
    const mapping = {
      root: makeNode('root', undefined, ['system']),
      system: makeNode('system', 'root', ['custom'], textMessage('system', ['system prompt'])),
      custom: makeNode(
        'custom',
        'system',
        ['user'],
        makeMessage('user', {
          content_type: 'user_editable_context',
          user_profile: 'profile',
          user_instructions: 'instructions',
        }),
      ),
      user: makeNode('user', 'custom', ['assistant-1'], textMessage('user', ['Question'])),
      'assistant-1': makeNode(
        'assistant-1',
        'user',
        ['memory'],
        textMessage('assistant', ['First ', 'reply'], {
          metadata: { model_slug: 'gpt-4o' },
        }),
      ),
      memory: makeNode(
        'memory',
        'assistant-1',
        ['assistant-2'],
        makeMessage('assistant', {
          content_type: 'model_editable_context',
          model_set_context: 'remember this',
        }),
      ),
      'assistant-2': makeNode('assistant-2', 'memory', [], textMessage('assistant', [' continued', 'second part'])),
    };

    const result = processConversation(makeConversation(mapping, 'assistant-2'));

    expect(result.modelSlug).toBe('gpt-4o');
    expect(result.model).toBe('GPT-4o');
    expect(result.conversationNodes).toHaveLength(2);
    expect(result.conversationNodes.map(node => node.message?.author.role)).toEqual(['user', 'assistant']);
    expect(result.conversationNodes[1].message?.content).toEqual({
      content_type: 'text',
      parts: ['First ', 'reply continued', 'second part'],
    });
  });

  it('falls back to a leaf node and default title when current_node is empty', () => {
    const mapping = {
      root: makeNode('root', undefined, ['user']),
      user: makeNode('user', 'root', ['assistant'], textMessage('user', ['Hello'])),
      assistant: makeNode('assistant', 'user', [], textMessage('assistant', ['Hi'])),
    };

    const result = processConversation(makeConversation(mapping, '', ''));

    expect(result.title).toBe('ChatGPT Conversation');
    expect(result.conversationNodes.map(node => node.id)).toEqual(['user', 'assistant']);
  });
});
