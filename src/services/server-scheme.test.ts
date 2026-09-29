import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';
import {
  isPrivateHost,
  knownScheme,
  resetSchemesForTest,
  resolveScheme,
  schemeFailed,
  seedScheme,
} from './server-scheme';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const request = jest.mocked(fetch);
const comfy = { ok: true, status: 200, json: async () => ({ system: { os: 'posix' }, devices: [] }) };
const tlsPortToPlainRequest = { ok: false, status: 400, json: async () => ({}) };

/** Answers `scheme` with `reply`, and fails the connection for anything else. */
function server(replies: Partial<Record<'http' | 'https', object>>) {
  request.mockImplementation((async (url: string) => {
    const reply = replies[url.startsWith('https:') ? 'https' : 'http'];
    if (!reply) throw new TypeError('Network request failed');
    return reply;
  }) as never);
}

const probed = () => request.mock.calls.map(([url]) => String(url).split(':')[0]);

beforeEach(async () => {
  jest.clearAllMocks();
  resetSchemesForTest();
  await AsyncStorage.clear();
});

test('explicit settings never probe', async () => {
  await expect(resolveScheme('Always', '203.0.113.5', 8188)).resolves.toBe('https');
  await expect(resolveScheme('Never', '203.0.113.5', 8188)).resolves.toBe('http');
  expect(request).not.toHaveBeenCalled();
});

test('a public IP without a certificate falls back to HTTP and is remembered', async () => {
  server({ http: comfy });
  await expect(resolveScheme('Auto', '154.59.156.35', 34526)).resolves.toBe('http');
  expect(probed()).toEqual(['https', 'http']);
  await expect(resolveScheme('Auto', '154.59.156.35', 34526)).resolves.toBe('http');
  expect(request).toHaveBeenCalledTimes(2);
});

test('private addresses try HTTP first', async () => {
  server({ http: comfy });
  await expect(resolveScheme('Auto', '192.168.1.20', 8188)).resolves.toBe('http');
  expect(probed()).toEqual(['http']);
});

test('a plain request answered by a TLS port does not count as HTTP', async () => {
  server({ http: tlsPortToPlainRequest, https: comfy });
  await expect(resolveScheme('Auto', '192.168.1.20', 8443)).resolves.toBe('https');
  expect(probed()).toEqual(['http', 'https']);
});

test('an authenticating proxy counts as answering', async () => {
  server({ https: { ok: false, status: 401, json: async () => ({}) } });
  await expect(resolveScheme('Auto', 'comfy.example.com', 443)).resolves.toBe('https');
});

test('once HTTPS worked, a failure never downgrades to HTTP', async () => {
  server({ https: comfy });
  await resolveScheme('Auto', 'comfy.example.com', 443);
  server({ http: comfy });
  schemeFailed('comfy.example.com', 443);
  await expect(resolveScheme('Auto', 'comfy.example.com', 443)).resolves.toBe('https');
  expect(knownScheme('comfy.example.com', 443)).toBe('https');
});

test('an unpinned HTTP choice is probed again after a failure', async () => {
  server({ http: comfy });
  await resolveScheme('Auto', '154.59.156.35', 34526);
  schemeFailed('154.59.156.35', 34526);
  server({ https: comfy });
  await expect(resolveScheme('Auto', '154.59.156.35', 34526)).resolves.toBe('https');
});

test('an unreachable server falls back by address and is not probed on every request', async () => {
  server({});
  await expect(resolveScheme('Auto', '203.0.113.5', 8188)).resolves.toBe('https');
  await expect(resolveScheme('Auto', '192.168.1.20', 8188)).resolves.toBe('http');
  const calls = request.mock.calls.length;
  await resolveScheme('Auto', '203.0.113.5', 8188);
  expect(request).toHaveBeenCalledTimes(calls);
});

test('the choice survives a restart', async () => {
  server({ https: comfy });
  await resolveScheme('Auto', 'comfy.example.com', 443);
  await new Promise((resolve) => setTimeout(resolve, 0));
  resetSchemesForTest();
  request.mockClear();
  await expect(resolveScheme('Auto', 'comfy.example.com', 443)).resolves.toBe('https');
  expect(request).not.toHaveBeenCalled();
});

test('isPrivateHost', () => {
  expect(isPrivateHost('localhost')).toBe(true);
  expect(isPrivateHost('studio.local')).toBe(true);
  expect(isPrivateHost('10.0.0.4')).toBe(true);
  expect(isPrivateHost('172.20.1.1')).toBe(true);
  expect(isPrivateHost('172.32.1.1')).toBe(false);
  expect(isPrivateHost('154.59.156.35')).toBe(false);
  expect(isPrivateHost('comfy.example.com')).toBe(false);
});

test('a legacy setting is seeded without probing, and an existing record wins', async () => {
  await seedScheme('comfy.example.com', 443, 'https');
  await seedScheme('154.59.156.35', 34526, 'http');
  await expect(resolveScheme('Auto', 'comfy.example.com', 443)).resolves.toBe('https');
  await expect(resolveScheme('Auto', '154.59.156.35', 34526)).resolves.toBe('http');
  expect(request).not.toHaveBeenCalled();
  // Seeded HTTPS is pinned like a probed one.
  schemeFailed('comfy.example.com', 443);
  expect(knownScheme('comfy.example.com', 443)).toBe('https');
  await seedScheme('comfy.example.com', 443, 'http');
  expect(knownScheme('comfy.example.com', 443)).toBe('https');
});
