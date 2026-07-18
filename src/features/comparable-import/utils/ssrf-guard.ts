import net from 'node:net';

// Blocked IPv4 ranges (CIDR). Covers loopback, private, link-local, CGNAT,
// multicast and reserved space.
const BLOCKED_IPV4_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) {
    return true;
  }
  for (const [base, bits] of BLOCKED_IPV4_CIDRS) {
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) {
      continue;
    }
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((ipInt & mask) === (baseInt & mask)) {
      return true;
    }
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::1' || addr === '::') {
    return true;
  }
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }
  const firstHextet = addr.split(':')[0];
  if (/^fe[89ab]/.test(firstHextet)) {
    return true; // fe80::/10 link-local
  }
  if (/^f[cd]/.test(firstHextet)) {
    return true; // fc00::/7 unique local
  }
  if (/^ff/.test(firstHextet)) {
    return true; // multicast
  }
  return false;
}

// Returns true for any address in a blocked/reserved range. Unparseable input
// is treated as blocked (safe default).
export function isBlockedIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) {
    return isBlockedIpv4(ip);
  }
  if (kind === 6) {
    return isBlockedIpv6(ip);
  }
  return true;
}

export type SsrfCheck = { ok: true } | { ok: false; reason: string };

// Syntactic SSRF validation (before DNS resolution): protocol, embedded
// credentials, localhost, and literal blocked IPs in the hostname.
export function validateUrlForSsrf(url: URL): SsrfCheck {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'protocol' };
  }
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'credentials' };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '' || host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, reason: 'localhost' };
  }
  if (net.isIP(host) !== 0 && isBlockedIp(host)) {
    return { ok: false, reason: 'blocked-ip' };
  }
  return { ok: true };
}
