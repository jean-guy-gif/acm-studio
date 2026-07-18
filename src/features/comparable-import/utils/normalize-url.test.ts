import { describe, expect, it } from 'vitest';

import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';

describe('normalizeUrl', () => {
  it('parses valid http(s) urls', () => {
    expect(normalizeUrl('https://example.com/a')?.hostname).toBe('example.com');
    expect(normalizeUrl('  http://example.com  ')?.protocol).toBe('http:');
  });

  it('returns null for invalid urls', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('example.com')).toBeNull();
  });

  it('flags non-http protocols', () => {
    expect(isAllowedProtocol(new URL('https://example.com'))).toBe(true);
    expect(isAllowedProtocol(new URL('ftp://example.com'))).toBe(false);
    expect(isAllowedProtocol(new URL('file:///etc/passwd'))).toBe(false);
  });
});
