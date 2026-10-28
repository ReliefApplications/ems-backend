import { lookup } from 'dns/promises';
import {
  assertPublicUrl,
  ForbiddenUrlError,
  isPrivateAddress,
} from '@utils/proxy/assertPublicUrl';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

describe('isPrivateAddress', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '127.255.255.255',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a00:5',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    'not-an-ip',
  ])('flags %s as non-public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '93.184.216.34',
    '100.63.255.255',
    '100.128.0.0',
    '172.15.255.255',
    '172.32.0.0',
    '192.167.1.1',
    '2606:4700::1111',
    '::ffff:5db8:d822',
  ])('accepts %s as public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe('assertPublicUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (lookup as jest.Mock).mockImplementation(async (hostname: string) => {
      switch (hostname) {
        case 'api.example.com':
          return [{ address: '93.184.216.34', family: 4 }];
        case 'dual.example.com':
          return [
            { address: '93.184.216.34', family: 4 },
            { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
          ];
        case 'internal.corp':
          return [{ address: '10.0.0.5', family: 4 }];
        case 'mixed.corp':
          return [
            { address: '93.184.216.34', family: 4 },
            { address: '192.168.0.10', family: 4 },
          ];
        case 'empty.example':
          return [];
        default:
          throw new Error('ENOTFOUND');
      }
    });
  });

  it.each([
    'https://api.example.com/v1',
    'http://dual.example.com:8080/path?x=1',
    'https://93.184.216.34/health',
    'https://[2606:4700::1111]/health',
  ])('accepts %s', async (value) => {
    await expect(assertPublicUrl(value)).resolves.toBeInstanceOf(URL);
  });

  it.each([
    ['not a url', 'invalid URL'],
    ['ftp://api.example.com', 'unsupported scheme'],
    ['file:///etc/passwd', 'file scheme'],
    ['http://localhost', 'localhost'],
    ['http://app.localhost', 'localhost subdomain'],
    ['http://127.0.0.1', 'loopback'],
    ['http://0x7f.1', 'loopback written in hexadecimal'],
    ['http://2130706433', 'loopback written as an integer'],
    ['http://10.0.0.5', 'private'],
    ['http://169.254.169.254/latest/meta-data', 'link local'],
    ['http://[::1]', 'IPv6 loopback'],
    ['http://[::ffff:127.0.0.1]', 'IPv4-mapped loopback'],
    ['http://[fd00::1]', 'unique local'],
    ['http://[fe80::1]', 'IPv6 link local'],
    ['http://internal.corp', 'resolves to private'],
    ['http://mixed.corp', 'one of the addresses is private'],
    ['http://empty.example', 'resolves to nothing'],
    ['http://unknown.example', 'cannot be resolved'],
  ])('refuses %s (%s)', async (value) => {
    await expect(assertPublicUrl(value)).rejects.toBeInstanceOf(
      ForbiddenUrlError
    );
  });

  it('does not resolve IP literals', async () => {
    await assertPublicUrl('https://93.184.216.34/health');
    expect(lookup).not.toHaveBeenCalled();
  });
});
