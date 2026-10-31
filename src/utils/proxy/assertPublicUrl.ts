import { isIP } from 'net';
import { lookup } from 'dns/promises';

/**
 * Error thrown when a URL must not be reached from the server
 * (unsupported scheme, loopback / private / link-local address, unresolvable host).
 */
export class ForbiddenUrlError extends Error {
  /**
   * Error thrown when a URL must not be reached from the server
   *
   * @param message reason
   */
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenUrlError';
  }
}

/**
 * Check whether an IPv4 address belongs to a range that must not be reached
 * from the server: unspecified, loopback, private, carrier-grade NAT,
 * link-local (cloud metadata services), multicast and reserved.
 *
 * @param ip IPv4 address
 * @returns true if the address is not a public address
 */
const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    a === 127 || // 127.0.0.0/8
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10
    (a === 169 && b === 254) || // 169.254.0.0/16
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    a >= 224 // multicast, reserved, broadcast
  );
};

/**
 * Check whether an IPv6 address belongs to a range that must not be reached
 * from the server: unspecified, loopback, unique local, link-local, multicast,
 * and IPv4-mapped addresses whose IPv4 part is private.
 *
 * @param ip IPv6 address
 * @returns true if the address is not a public address
 */
const isPrivateIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  // IPv4-mapped, dotted form (::ffff:127.0.0.1)
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    return isPrivateIPv4(dotted[1]);
  }
  // IPv4-mapped, hexadecimal form (::ffff:7f00:1), as produced by the URL parser
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return isPrivateIPv4(
      `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
    );
  }
  return (
    lower === '::' ||
    lower === '::1' ||
    /^f[cd]/.test(lower) || // fc00::/7 unique local
    /^fe[89ab]/.test(lower) || // fe80::/10 link local
    /^ff/.test(lower) // multicast
  );
};

/**
 * Check whether an IP address must not be reached from the server.
 * Anything that is not a valid public IPv4 / IPv6 address is considered private.
 *
 * @param ip IP address
 * @returns true if the address is not a public address
 */
export const isPrivateAddress = (ip: string): boolean => {
  const version = isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true;
};

/**
 * Ensure a URL can safely be requested by the server on behalf of a user:
 * http(s) only, and the host must not be, or resolve to, a loopback, private,
 * link-local or otherwise non-public address.
 *
 * Used to prevent server-side request forgery when a URL is supplied by the client.
 *
 * @param value URL to check
 * @returns the parsed URL when it is acceptable
 * @throws ForbiddenUrlError when the URL must not be requested
 */
export const assertPublicUrl = async (value: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ForbiddenUrlError('Invalid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ForbiddenUrlError(`Unsupported protocol ${url.protocol}`);
  }
  // IPv6 literals are bracketed in URL hostnames
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new ForbiddenUrlError('Loopback host is not allowed');
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new ForbiddenUrlError('Non-public address is not allowed');
    }
    return url;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new ForbiddenUrlError('Host cannot be resolved');
  }
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new ForbiddenUrlError('Host resolves to a non-public address');
  }
  return url;
};
