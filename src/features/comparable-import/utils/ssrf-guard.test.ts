import { describe, expect, it } from 'vitest';

import { isBlockedIp, validateUrlForSsrf } from '@/features/comparable-import/utils/ssrf-guard';

describe('isBlockedIp', () => {
  it('blocks private/reserved/loopback/link-local IPv4', () => {
    for (const ip of [
      '0.0.0.0',
      '127.0.0.1',
      '10.0.0.1',
      '100.64.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '192.168.1.1',
      '224.0.0.1',
      '240.0.0.1',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it('blocks blocked IPv6', () => {
    for (const ip of [
      '::1',
      '::',
      'fc00::1',
      'fd00::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it('allows public IPs', () => {
    expect(isBlockedIp('93.184.216.34')).toBe(false);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
  });

  it('blocks unparseable input', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
});

describe('validateUrlForSsrf', () => {
  it('rejects forbidden protocols', () => {
    expect(validateUrlForSsrf(new URL('ftp://example.com')).ok).toBe(false);
    expect(validateUrlForSsrf(new URL('file:///etc/passwd')).ok).toBe(false);
  });

  it('rejects localhost and literal private IPs', () => {
    expect(validateUrlForSsrf(new URL('http://localhost')).ok).toBe(false);
    expect(validateUrlForSsrf(new URL('http://127.0.0.1')).ok).toBe(false);
    expect(validateUrlForSsrf(new URL('http://[::1]')).ok).toBe(false);
    expect(validateUrlForSsrf(new URL('http://169.254.169.254')).ok).toBe(false);
    expect(validateUrlForSsrf(new URL('http://192.168.1.1')).ok).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(validateUrlForSsrf(new URL('http://user:pass@example.com')).ok).toBe(false);
  });

  it('accepts a public https url', () => {
    expect(validateUrlForSsrf(new URL('https://example.com/listing/1')).ok).toBe(true);
  });
});
