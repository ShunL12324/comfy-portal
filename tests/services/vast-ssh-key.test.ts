import { registerSshKey, VastError, isKeyAlreadyRegistered } from '@/services/vast';

const respond = (status: number, body: string) =>
  jest.fn(async () => ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response);

afterEach(() => jest.restoreAllMocks());

test('a key vast already has counts as registered', async () => {
  global.fetch = respond(400, '{"success": false, "msg": "the ssh key already exists on this account"}');
  await expect(registerSshKey('key', 'ssh-ed25519 AAAA device')).resolves.toBeUndefined();
});

test('other failures still throw', async () => {
  global.fetch = respond(400, '{"success": false, "msg": "invalid ssh key"}');
  await expect(registerSshKey('key', 'not a key')).rejects.toBeInstanceOf(VastError);
  global.fetch = respond(500, 'boom');
  await expect(registerSshKey('key', 'ssh-ed25519 AAAA device')).rejects.toBeInstanceOf(VastError);
});

test('only a 400 that says the key exists is treated as a duplicate', () => {
  expect(isKeyAlreadyRegistered(new VastError('vast.ai request failed (400): the ssh key already exists', 400))).toBe(
    true,
  );
  expect(isKeyAlreadyRegistered(new VastError('already exists', 500))).toBe(false);
  expect(isKeyAlreadyRegistered(new Error('already exists'))).toBe(false);
});
