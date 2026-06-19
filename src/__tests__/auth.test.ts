import { describe, it, expect, beforeEach, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, unknown>());

vi.mock('../utils/storage', () => ({
  ScriptStorage: {
    get: <T>(key: string): T | null => storage.has(key) ? storage.get(key) as T : null,
    set: <T>(key: string, value: T): void => {
      storage.set(key, value);
    },
    delete: (key: string): void => {
      storage.delete(key);
    },
  },
}));

import {
  EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY,
  authorizeApiKey,
  clearApiKeyAuthorization,
  getExporterAuthStatus,
  issueApiKey,
  requireExporterApiAuth,
  revokeApiKey,
  verifyApiKey,
} from '../auth';

describe('exporter API auth', () => {
  beforeEach(() => {
    revokeApiKey();
    storage.clear();
  });

  it('requires an issued API key before API access is allowed', async () => {
    await expect(requireExporterApiAuth()).rejects.toMatchObject({
      code: 'api-key-not-configured',
    });

    await expect(getExporterAuthStatus()).resolves.toMatchObject({
      configured: false,
      verified: false,
    });
  });

  it('issues an API key and stores only its digest', async () => {
    const issued = await issueApiKey();
    const digest = storage.get(EXPORTER_AUTH_API_KEY_DIGEST_STORAGE_KEY) as string | undefined;

    expect(issued.apiKey).toMatch(/^aice_/);
    expect(typeof digest).toBe('string');
    expect(digest as string).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(issued.apiKey);
    await expect(requireExporterApiAuth()).resolves.toBeUndefined();
  });

  it('verifies submitted keys against the configured digest', async () => {
    const { apiKey } = await issueApiKey();

    expect(await verifyApiKey(apiKey)).toBe(true);
    expect(await verifyApiKey(`${apiKey}x`)).toBe(false);
  });

  it('requires session authorization after issuing a key', async () => {
    const { apiKey } = await issueApiKey();
    clearApiKeyAuthorization();

    await expect(requireExporterApiAuth()).rejects.toMatchObject({
      code: 'api-key-not-verified',
    });

    expect(await authorizeApiKey('wrong-key')).toBe(false);
    expect(await authorizeApiKey(apiKey)).toBe(true);
    await expect(requireExporterApiAuth()).resolves.toBeUndefined();
  });
});
