import { describe, it, expect } from 'vitest';
import { getGeminiChatIdFromUrl } from '../providers/gemini';

describe('getGeminiChatIdFromUrl', () => {
  it('extracts an app conversation id', () => {
    expect(getGeminiChatIdFromUrl('/app/abc-123_DEF')).toBe('abc-123_DEF');
  });

  it('returns null outside Gemini app conversations', () => {
    expect(getGeminiChatIdFromUrl('/app')).toBeNull();
    expect(getGeminiChatIdFromUrl('/share/abc-123')).toBeNull();
  });
});
