import { describe, expect, it } from 'vitest';
import { getActiveProvider, providers } from '../providers';

describe('provider registry', () => {
  it('keeps provider priority explicit', () => {
    expect(providers.map(provider => provider.id)).toEqual(['chatgpt', 'claude', 'gemini']);
  });

  it.each([
    ['chatgpt.com', 'chatgpt'],
    ['chat.openai.com', 'chatgpt'],
    ['claude.ai', 'claude'],
    ['gemini.google.com', 'gemini'],
    ['example.com', 'chatgpt'],
  ])('resolves %s to %s', (host, providerId) => {
    expect(getActiveProvider(host).id).toBe(providerId);
  });

  it('uses the current location host by default', () => {
    expect(getActiveProvider().id).toBe('chatgpt');
  });
});
