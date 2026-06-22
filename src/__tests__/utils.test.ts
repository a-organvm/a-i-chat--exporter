import { describe, it, expect } from 'vitest';
import {
  noop,
  nonNullable,
  dateStr,
  unixTimestampToISOString,
  jsonlStringify,
} from '../utils/utils';

describe('noop', () => {
  it('returns undefined', () => {
    expect(noop()).toBeUndefined();
  });
});

describe('nonNullable', () => {
  it('returns true for a string', () => {
    expect(nonNullable('hello')).toBe(true);
  });

  it('returns true for 0', () => {
    expect(nonNullable(0)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(nonNullable('')).toBe(true);
  });

  it('returns true for false', () => {
    expect(nonNullable(false)).toBe(true);
  });

  it('returns false for null', () => {
    expect(nonNullable(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(nonNullable(undefined)).toBe(false);
  });
});

describe('dateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    expect(dateStr(date)).toBe('2026-01-15');
  });

  it('pads single-digit month and day', () => {
    const date = new Date(2025, 2, 5); // Mar 5, 2025
    expect(dateStr(date)).toBe('2025-03-05');
  });

  it('handles December 31', () => {
    const date = new Date(2024, 11, 31);
    expect(dateStr(date)).toBe('2024-12-31');
  });
});

describe('unixTimestampToISOString', () => {
  it('converts unix timestamp to ISO string', () => {
    const result = unixTimestampToISOString(1704067200); // 2024-01-01T00:00:00Z
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns empty string for 0', () => {
    expect(unixTimestampToISOString(0)).toBe('');
  });

  it('returns empty string for falsy value', () => {
    expect(unixTimestampToISOString(undefined as unknown as number)).toBe('');
  });
});

describe('jsonlStringify', () => {
  it('stringifies each item on its own line', () => {
    const result = jsonlStringify([{ a: 1 }, { b: 2 }]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual({ a: 1 });
    expect(JSON.parse(lines[1])).toEqual({ b: 2 });
  });

  it('does not add indentation', () => {
    const result = jsonlStringify([{ nested: { key: 'value' } }]);
    expect(result).not.toContain('\n ');
    expect(result).not.toContain('\n\t');
  });

  it('handles empty array', () => {
    expect(jsonlStringify([])).toBe('');
  });

  it('handles single item', () => {
    const result = jsonlStringify([{ x: 1 }]);
    expect(result).toBe('{"x":1}');
  });
});
