import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KEY_TIMESTAMP_24H, KEY_TIMESTAMP_ENABLED, KEY_TIMESTAMP_HTML } from '../constants';
import { exportAllToHtml } from '../exporter/html';
import { exportAllToJson } from '../exporter/json';
import { exportAllToMarkdown } from '../exporter/markdown';
import { ScriptStorage } from '../utils/storage';
import type { ApiConversationWithId, Citation, ConversationNodeMessage } from '../api';

const downloadFileMock = vi.hoisted(() => vi.fn());
const getUserAvatarMock = vi.hoisted(() => vi.fn(async () => 'data:image/png;base64,user-avatar'));

vi.mock('../utils/download', async () => {
  const actual = await vi.importActual<typeof import('../utils/download')>('../utils/download');
  return {
    ...actual,
    downloadFile: downloadFileMock,
  };
});

vi.mock('../page', async () => {
  const actual = await vi.importActual<typeof import('../page')>('../page');
  return {
    ...actual,
    getUserAvatar: getUserAvatarMock,
  };
});

type MessageOptions = {
  id?: string;
  metadata?: ConversationNodeMessage['metadata'];
  recipient?: ConversationNodeMessage['recipient'];
  createTime?: number;
  name?: ConversationNodeMessage['author']['name'];
};

function makeMessage(
  role: ConversationNodeMessage['author']['role'],
  content: ConversationNodeMessage['content'],
  options: MessageOptions = {},
): ConversationNodeMessage {
  return {
    id: options.id ?? `${role}-${content.content_type}`,
    author: {
      role,
      metadata: {},
      ...(options.name ? { name: options.name } : {}),
    },
    content,
    create_time: options.createTime,
    metadata: options.metadata,
    recipient: options.recipient ?? 'all',
    status: 'finished_successfully',
    weight: 1,
  };
}

function textMessage(
  role: ConversationNodeMessage['author']['role'],
  text: string,
  options: MessageOptions = {},
): ConversationNodeMessage {
  return makeMessage(role, { content_type: 'text', parts: [text] }, {
    ...options,
    id: options.id ?? `${role}-${text.slice(0, 8)}`,
  });
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
    getUserAvatarMock.mockResolvedValue('data:image/png;base64,user-avatar');
    ScriptStorage.delete(KEY_TIMESTAMP_ENABLED);
    ScriptStorage.delete(KEY_TIMESTAMP_HTML);
    ScriptStorage.delete(KEY_TIMESTAMP_24H);
    vi.stubGlobal('document', {
      documentElement: {
        lang: 'fr',
        style: {
          getPropertyValue: (property: string) => property === 'color-scheme' ? 'dark' : '',
        },
      },
    } as Document);
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

  it('exports html zip files with de-duplicated names, metadata, timestamps, and safe rendered messages', async () => {
    ScriptStorage.set(KEY_TIMESTAMP_ENABLED, true);
    ScriptStorage.set(KEY_TIMESTAMP_HTML, true);
    ScriptStorage.set(KEY_TIMESTAMP_24H, true);

    const citation: Citation = {
      start_ix: 0,
      end_ix: 10,
      citation_format_type: 'tether_og',
      metadata: {
        extra: {
          cited_message_idx: 7,
          evidence_text: 'evidence',
        },
        text: 'source text',
        title: 'Source Title',
        type: 'webpage',
        url: 'https://example.com/source',
      },
    };
    const conversations = [
      makeApiConversation('conv-html-1', 'Same Title', [
        textMessage('user', 'Hello <script>& "user"', { createTime: 1704067200 }),
        textMessage('assistant', 'Answer with **markdown** and citation 【7†(Docs)】 plus \\(x + y\\)', {
          createTime: 1704067260,
          metadata: {
            citations: [citation],
            model_slug: 'gpt-4',
          },
        }),
        textMessage('assistant', 'hidden browser call', { recipient: 'browser' }),
        textMessage('tool', 'tool output'),
      ]),
      makeApiConversation('conv-html-2', 'Same Title', [
        textMessage('user', 'Second conversation'),
      ]),
    ];

    await exportAllToHtml('{title}', conversations, [
      { name: 'title', value: '{title}' },
      { name: 'source', value: '{source}' },
      { name: 'model', value: '{model}/{mode_name}' },
      { name: 'created', value: '{create_time}' },
      { name: '', value: 'ignored' },
    ]);

    expect(downloadFileMock).toHaveBeenCalledWith('chatgpt-export-html.zip', 'application/zip', expect.any(Blob));

    const zip = await readDownloadedZip();
    expect(Object.keys(zip.files).sort()).toEqual(['Same_Title (1).html', 'Same_Title.html']);

    const html = await zip.file('Same_Title.html')!.async('string');
    expect(html).toContain('<html lang="fr" data-theme="dark">');
    expect(html).toContain('<title>Same Title</title>');
    expect(html).toContain('data:image/png;base64,user-avatar');
    expect(html).toContain('<summary>Metadata</summary>');
    expect(html).toContain('<div class="metadata_item"><div>title</div><div>Same Title</div></div>');
    expect(html).toContain('<div class="metadata_item"><div>source</div><div>https://chatgpt.com/c/conv-html-1</div></div>');
    expect(html).toContain('<div class="metadata_item"><div>model</div><div>GPT-4/gpt-4</div></div>');
    expect(html).toContain('<div class="metadata_item"><div>created</div><div>2024-01-01T00:00:00.000Z</div></div>');
    expect(html).toContain('<p class="no-katex">Hello &lt;script&gt;&amp; &quot;user&quot;</p>');
    expect(html).toContain('<strong>markdown</strong>');
    expect(html).toContain('<time class="time" datetime="2024-01-01T00:00:00.000Z"');
    expect(html).not.toContain('【7†(Docs)】');
    expect(html).not.toContain('hidden browser call');
    expect(html).not.toContain('tool output');
  });

  it('renders html-specific media and browsing content types', async () => {
    const conversations = [
      makeApiConversation('conv-html-media', 'Media Export', [
        makeMessage('assistant', { content_type: 'tether_quote', text: 'quoted text', title: 'Quoted Result' }, {
          metadata: { model_slug: 'gpt-4o' },
        }),
        makeMessage('assistant', { content_type: 'tether_browsing_display', result: 'browser result' }, {
          metadata: {
            model_slug: 'gpt-4o',
            _cite_metadata: {
              citation_format: { name: 'tether_og' },
              metadata_list: [
                { title: 'Browser Source', url: 'https://example.com/browser', text: 'source text' },
              ],
            },
          },
        }),
        makeMessage('tool', { content_type: 'execution_output', text: 'image result' }, {
          name: 'python',
          metadata: {
            aggregate_result: {
              code: 'plot()',
              end_time: 1704067260,
              jupyter_messages: [],
              messages: [
                {
                  image_url: 'https://example.com/chart.png',
                  message_type: 'image',
                  sender: 'server',
                  time: 1704067260,
                  width: 320,
                  height: 180,
                },
              ],
              run_id: 'run-1',
              start_time: 1704067200,
              status: 'success',
              update_time: 1704067260,
            },
          },
        }),
        makeMessage('user', {
          content_type: 'multimodal_text',
          parts: [
            'Describe this <image>',
            {
              asset_pointer: 'data:image/png;base64,input-image',
              content_type: 'image_asset_pointer',
              fovea: 0,
              height: 90,
              size_bytes: 1234,
              width: 120,
            },
            {
              content_type: 'audio_transcription',
              decoding_id: null,
              direction: 'in',
              text: 'transcribed audio',
            },
          ],
        }),
      ]),
    ];

    await exportAllToHtml('{title}', conversations);

    const zip = await readDownloadedZip();
    const html = await zip.file('Media_Export.html')!.async('string');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('Quoted Result');
    expect(html).toContain('<a href="https://example.com/browser">Browser Source</a>');
    expect(html).toContain('<img src="https://example.com/chart.png" height="180" width="320" />');
    expect(html).toContain('<p class="no-katex">Describe this &lt;image&gt;</p>');
    expect(html).toContain('<img src="data:image/png;base64,input-image" height="90" width="120" />');
    expect(html).toContain('<div style="font-style: italic; opacity: 0.65;">“transcribed audio”</div>');
  });
});
