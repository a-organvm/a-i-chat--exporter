import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFileNameWithFormat } from '../utils/download';

describe('getFileNameWithFormat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T12:34:56.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sanitizes titles and substitutes all supported placeholders', () => {
    const fileName = getFileNameWithFormat(
      '{title}-{date}-{timestamp}-{chat_id}-{create_time}-{update_time}',
      'md',
      {
        title: 'Unsafe / title: one',
        chatId: 'abc123',
        createTime: 1704067200,
        updateTime: 1704153600,
      },
    );

    expect(fileName).toBe(
      'Unsafe_title_one-2026-06-19-2026-06-19T12-34-56-abc123-2024-01-01T00:00:00.000Z-2024-01-02T00:00:00.000Z.md',
    );
  });

  it('uses seconds when defaulting timestamps from Date.now', () => {
    expect(getFileNameWithFormat('{create_time}', 'json', { title: 'Export' })).toBe(
      '2026-06-19T12:34:56.000Z.json',
    );
  });
});
