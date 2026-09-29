import { ComfyClient } from './comfy-client';
jest.mock('@/store/install-id', () => ({ getInstallId: () => 'test' }));
jest.mock('./network', () => ({ buildServerUrl: jest.fn(), fetchWithAuth: jest.fn() }));
jest.mock('./server-scheme', () => ({ resolveScheme: jest.fn() }));

test('partial output recovery uses stable server identities, not changing download paths', async () => {
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  const images = ['first.png', 'second.png'].map((filename) => ({ filename, subfolder: '', type: 'output' }));
  jest.spyOn(client, 'getHistory').mockResolvedValue({ prompt: { outputs: { '1': { images } } } });
  const download = jest
    .spyOn(client as any, 'downloadMedia')
    .mockResolvedValueOnce('file:///cache/random-first.png')
    .mockRejectedValueOnce(new Error('network interrupted'))
    .mockResolvedValueOnce('file:///cache/new-second.png');
  const persisted = new Set<string>();
  const save = jest.fn(async (_uri: string, sourceId: string) => {
    persisted.add(sourceId);
  });
  await expect(client.fetchAndDownloadResults('prompt', {}, persisted, save)).rejects.toThrow('network interrupted');
  expect(persisted.size).toBe(1);
  await client.fetchAndDownloadResults('prompt', {}, persisted, save);
  expect(download.mock.calls.map((call) => call[0])).toEqual(['first.png', 'second.png', 'second.png']);
  expect(save).toHaveBeenCalledTimes(2);
  expect(persisted.size).toBe(2);
});
test('a failed local commit never adds the output to the completed set', async () => {
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  jest.spyOn(client, 'getHistory').mockResolvedValue({
    prompt: {
      outputs: {
        '1': {
          images: [{ filename: 'first.png', subfolder: '', type: 'output' }],
        },
      },
    },
  });
  jest.spyOn(client as any, 'downloadMedia').mockResolvedValue('file:///cache/result.png');
  const persisted = new Set<string>();
  await expect(
    client.fetchAndDownloadResults('prompt', {}, persisted, async () => {
      throw new Error('disk full');
    }),
  ).rejects.toThrow('disk full');
  expect(persisted.size).toBe(0);
});
