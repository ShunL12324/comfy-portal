import { isVideoUrl } from '@/features/generation/utils/media';
import type { Server } from '@/features/server/types';
import { deleteServerAssets, findMissingAssets, getSavedOutputPath, listServerAssets } from '../comfy-assets';
import { fetchWithAuth } from '../network';

jest.mock('../network', () => ({
  buildServerUrl: async (_ssl: string, host: string, port: number, path: string) =>
    `http://${host}:${port}${path}`,
  fetchWithAuth: jest.fn(),
}));

const server: Server = {
  id: 'server',
  name: 'ComfyUI',
  host: 'localhost',
  port: 8188,
  useSSL: 'Never',
  status: 'online',
  token: 'a+b&=',
};

const request = jest.mocked(fetchWithAuth);
const reply = (status: number, body?: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
}) as Response;

beforeEach(() => request.mockReset());

test('builds usable URLs for nested output files and preserves the output identity', async () => {
  request.mockResolvedValue(reply(200, {
    items: [{ relpath: '한글 + #/sample + #.mov', mtime: 10, size: 42 }],
    has_more: false,
  }));

  const [asset] = await listServerAssets(server);
  expect(isVideoUrl(asset.url)).toBe(true);
  expect(new URL(asset.url).searchParams.get('token')).toBe(server.token);
  expect(getSavedOutputPath(undefined, asset.url)).toBe(asset.outputPath);
  expect(getSavedOutputPath(undefined, 'file:///local/old.png')).toBeUndefined();
});

test('treats a hidden file or a transient server failure as present in local history', async () => {
  request
    .mockResolvedValueOnce(reply(200))
    .mockResolvedValueOnce(reply(503))
    .mockResolvedValueOnce(reply(404));

  await expect(findMissingAssets(server, ['hidden.png', 'unavailable.png', 'deleted.png']))
    .resolves.toEqual(new Set(['deleted.png']));
});

test('reports confirmed deletions, with idempotent handling of already missing files', async () => {
  request
    .mockResolvedValueOnce(reply(200, {
      removed: ['deleted.png'],
      failed: ['gone.png', 'retained.png'],
    }))
    .mockResolvedValueOnce(reply(404))
    .mockResolvedValueOnce(reply(200));

  await expect(deleteServerAssets(server, ['deleted.png', 'gone.png', 'retained.png']))
    .resolves.toEqual(new Set(['deleted.png', 'gone.png']));
  expect(JSON.parse(request.mock.calls[0][2]!.body as string)).toEqual({
    relpaths: ['deleted.png', 'gone.png', 'retained.png'],
    mode: 'delete',
  });
});
