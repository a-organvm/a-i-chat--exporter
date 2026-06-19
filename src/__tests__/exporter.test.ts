import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAllToJson } from '../exporter/json';
import { exportAllToMarkdown } from '../exporter/markdown';
import type { ApiConversationWithId, Citation, ConversationNodeMessage } from '../api';

const downloadFileMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/download', async () => {
  const actual = await vi.importActual<typeof import('../utils/download')>('../utils/download');
  return {
    ...actual,
    downloadFile: downloadFileMock,
  };
});

type MessageOptions = {
  id?: string;
  metadata?: ConversationNodeMessage['metadata'];
  recipient?: ConversationNodeMessage['recipient'];
};

function textMessage(
  role: ConversationNodeMessage['author']['role'],
  text: string,
  options: MessageOptions = {},
): ConversationNodeMessage {
  return {
    id: options.id ?? `${role}-${text.slice(0, 8)}`,
    author: { role, metadata: {} },
    content: { content_type: 'text', parts: [text] },
    metadata: options.metadata,
    recipient: options.recipient ?? 'all',
    status: 'finished_successfully',
    weight: 1,
  };
}

function makeApiConversation(
  id: string,
  title: string,
  messages: ConversationNodeMessage[],
): ApiConversationWithId {
  const rootId = `${id}-root`;
  const mapping: ApiConversationWithId['mapping'] = {
    [rootId]: { id: rootId, children: [] },
  };
  let parent = rootId;

  messages.forEach((message, index) => {
    const nodeId = `${id}-node-${index + 1}`;
    mapping[parent].children = [nodeId];
    mapping[nodeId] = {
      id: nodeId,
      parent,
      children: [],
      message,
    };
    parent = nodeId;
  });

  return {
    id,
    title,
    create_time: 1704067200,
    update_time: 1704153600,
    current_node: parent,
    mapping,
    moderation_results: [],
    is_archived: false,
  };
}

async function readDownloadedZip() {
  const blob = downloadFileMock.mock.calls[0][2] as Blob;
  return JSZip.loadAsync(await blob.arrayBuffer());
}

describe('bulk exporters', () => {
  beforeEach(() => {
    downloadFileMock.mockReset();
  });

  it('exports markdown zip files with de-duplicated names, metadata, citations, and filtered messages', async () => {
    const citation: Citation = {
      start_ix: 0,
      end_ix: 10,
      citation_format_type: 'tether_og',
      metadata: {
        extra: {
          cited_message_idx: 3,
          evidence_text: 'evidence',
        },
        text: 'source text',
        title: 'Source Title',
        type: 'webpage',
        url: 'https://example.com/source',
      },
    };
    const conversations = [
      makeApiConversation('conv-1', 'Same Title', [
        textMessage('user', 'Hello from user'),
        textMessage('assistant', 'hidden browser call', { recipient: 'browser' }),
        textMessage('tool', 'tool output'),
        textMessage('assistant', 'Answer with source 【3†(Docs)】', {
          metadata: {
            citations: [citation],
            model_slug: 'gpt-4',
          },
        }),
      ]),
      makeApiConversation('conv-2', 'Same Title', [
        textMessage('user', 'Second conversation'),
      ]),
    ];

    await exportAllToMarkdown('{title}', conversations, [
      { name: 'title', value: '{title}' },
      { name: 'source', value: '{source}' },
      { name: 'model', value: '{model}/{model_name}' },
      { name: 'created', value: '{create_time}' },
      { name: '', value: 'ignored' },
    ]);

    expect(downloadFileMock).toHaveBeenCalledWith('chatgpt-export-markdown.zip', 'application/zip', expect.any(Blob));

    const zip = await readDownloadedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Same_Title (1).md', 'Same_Title.md']);

    const markdown = await zip.file('Same_Title.md')!.async('string');
    expect(markdown).toContain('title: Same Title');
    expect(markdown).toContain('source: https://chatgpt.com/c/conv-1');
    expect(markdown).toContain('model: GPT-4/gpt-4');
    expect(markdown).toContain('created: 2024-01-01T00:00:00.000Z');
    expect(markdown).toContain('# Same Title');
    expect(markdown).toContain('#### You:\nHello from user');
    expect(markdown).toContain('#### ChatGPT:');
    expect(markdown).toContain('Answer with source [^3]');
    expect(markdown).toContain('[^3]: Source Title');
    expect(markdown).not.toContain('hidden browser call');
    expect(markdown).not.toContain('tool output');
  });

  it('exports json zip files using the raw conversation payload', async () => {
    const conversations = [
      makeApiConversation('conv-1', 'Same Title', [
        textMessage('user', 'Hello from user'),
      ]),
      makeApiConversation('conv-2', 'Same Title', [
        textMessage('assistant', 'Hello from assistant'),
      ]),
    ];

    await exportAllToJson('{title}', conversations);

    expect(downloadFileMock).toHaveBeenCalledWith('chatgpt-export-json.zip', 'application/zip', expect.any(Blob));

    const zip = await readDownloadedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Same_Title (1).json', 'Same_Title.json']);

    const rawConversation = JSON.parse(await zip.file('Same_Title.json')!.async('string'));
    expect(rawConversation.id).toBe('conv-1');
    expect(rawConversation.mapping['conv-1-node-1'].message.content.parts).toEqual(['Hello from user']);
  });
});
