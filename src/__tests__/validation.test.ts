import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  assertValidChatId,
  assertValidHtmlUrl,
  assertValidPagination,
  assertValidRequestUrl,
  isValidationError,
} from '../utils/validation';

describe('assertValidChatId', () => {
  it('accepts plain conversation ids and returns them trimmed', () => {
    expect(assertValidChatId('  abc-123_DEF  ')).toBe('abc-123_DEF');
  });

  it('accepts the internal share-prefixed form', () => {
    expect(assertValidChatId('__share__abc-123')).toBe('__share__abc-123');
  });

  it('rejects non-string input', () => {
    expect(() => assertValidChatId(undefined)).toThrow(ValidationError);
    expect(() => assertValidChatId(42 as unknown)).toThrow(ValidationError);
  });

  it('rejects empty or whitespace-only ids', () => {
    expect(() => assertValidChatId('')).toThrow(/must not be empty/);
    expect(() => assertValidChatId('   ')).toThrow(/must not be empty/);
  });

  it('rejects ids with path traversal or unsafe characters', () => {
    expect(() => assertValidChatId('../etc/passwd')).toThrow(/invalid format/);
    expect(() => assertValidChatId('a/b')).toThrow(/invalid format/);
    expect(() => assertValidChatId('has space')).toThrow(/invalid format/);
    expect(() => assertValidChatId('__share__')).toThrow(/invalid format/);
  });

  it('uses a custom label in the error message', () => {
    expect(() => assertValidChatId('', 'project')).toThrow(/project must not be empty/);
  });
});

describe('assertValidPagination', () => {
  it('accepts sane offset/limit pairs', () => {
    expect(() => assertValidPagination(0, 20)).not.toThrow();
    expect(() => assertValidPagination(100, 1)).not.toThrow();
  });

  it('rejects negative or non-integer offsets', () => {
    expect(() => assertValidPagination(-1, 20)).toThrow(/offset/);
    expect(() => assertValidPagination(1.5, 20)).toThrow(/offset/);
  });

  it('rejects non-positive or oversized limits', () => {
    expect(() => assertValidPagination(0, 0)).toThrow(/limit/);
    expect(() => assertValidPagination(0, -5)).toThrow(/limit/);
    expect(() => assertValidPagination(0, 1001)).toThrow(/exceed 1000/);
  });
});

describe('assertValidRequestUrl', () => {
  it('accepts absolute http(s) urls', () => {
    expect(assertValidRequestUrl('https://chatgpt.com/backend-api/conversation/x')).toContain('https://');
  });

  it('rejects an unconfigured (undefined/empty) base url', () => {
    expect(() => assertValidRequestUrl(undefined)).toThrow(/not configured/);
    expect(() => assertValidRequestUrl('')).toThrow(/not configured/);
  });

  it('rejects relative urls and non-http protocols', () => {
    expect(() => assertValidRequestUrl('/conversation/x')).toThrow(/not a valid URL/);
    expect(() => assertValidRequestUrl('javascript:alert(1)')).toThrow(/must use http/);
  });
});

describe('assertValidHtmlUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(assertValidHtmlUrl('https://example.com/image.png')).toContain('https://');
    expect(assertValidHtmlUrl('http://example.com/image.png')).toContain('http://');
  });

  it('accepts data URIs for embedded images', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KG';
    expect(assertValidHtmlUrl(dataUri)).toBe(dataUri);
  });

  it('accepts blob: URLs for exported assets', () => {
    const blobUrl = 'blob:https://example.com/12345678';
    expect(assertValidHtmlUrl(blobUrl)).toBe(blobUrl);
  });

  it('accepts mailto: links', () => {
    expect(assertValidHtmlUrl('mailto:user@example.com')).toContain('mailto:');
  });

  it('rejects dangerous protocols (javascript, vbscript, etc)', () => {
    expect(() => assertValidHtmlUrl('javascript:alert(1)')).toThrow(/unsupported protocol/);
    expect(() => assertValidHtmlUrl('vbscript:msgbox')).toThrow(/unsupported protocol/);
    expect(() => assertValidHtmlUrl('data:text/html,<script>alert(1)</script>')).toThrow(/not a valid data URI/);
  });

  it('rejects empty or whitespace-only URLs', () => {
    expect(() => assertValidHtmlUrl('')).toThrow(/must not be empty/);
    expect(() => assertValidHtmlUrl('   ')).toThrow(/must not be empty/);
  });

  it('rejects malformed data URIs', () => {
    expect(() => assertValidHtmlUrl('data:invalid')).toThrow(/not a valid data URI/);
  });
});

describe('isValidationError', () => {
  it('recognizes ValidationError instances and duck-typed shapes', () => {
    expect(isValidationError(new ValidationError('x'))).toBe(true);
    expect(isValidationError({ name: 'ValidationError' })).toBe(true);
    expect(isValidationError(new Error('x'))).toBe(false);
    expect(isValidationError(null)).toBe(false);
  });
});
