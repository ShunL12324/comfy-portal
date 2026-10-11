import { fetchImageLayers, layersFromManifest, parseGhcrImage, pickPlatformManifest } from '@/services/image-manifest';
import index from '../features/cloud/fixtures/ghcr-index-sha-44dfa01.json';
import manifest from '../features/cloud/fixtures/ghcr-manifest-sha-44dfa01.json';

const IMAGE = 'ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01';

test('only GHCR image references are read', () => {
  expect(parseGhcrImage(IMAGE)).toEqual({
    repository: 'shunl12324/comfy-portal-cloud-server',
    reference: 'sha-44dfa01',
  });
  expect(parseGhcrImage('ghcr.io/shunl12324/comfy-portal-cloud-server')).toMatchObject({ reference: 'latest' });
  expect(parseGhcrImage('nvidia/cuda:13.3.0-cudnn-devel-ubuntu22.04')).toBeUndefined();
});

test('the published index points at one linux/amd64 manifest', () => {
  expect(pickPlatformManifest(index)).toBe('sha256:139ff0e9768e4346516655a9f60a8750cfb6e26232403122df72ce7de96ffc5a');
  expect(pickPlatformManifest({})).toBeUndefined();
});

test('layers and their compressed sizes, in pull order', () => {
  const layers = layersFromManifest(manifest)!;
  expect(layers).toHaveLength(26);
  expect(layers[5]).toEqual({
    digest: expect.stringMatching(/^sha256:ce2970b16a29/),
    size: 343487844,
  });
  expect(layers.reduce((sum, layer) => sum + layer.size, 0)).toBe(6002328324);
  expect(layersFromManifest({ manifests: [] })).toBeUndefined();
});

test('fetch: token, index, then the platform manifest', async () => {
  const fetchMock = jest.fn(async (url: string) => {
    const body = url.includes('/token') ? { token: 'anon' } : url.endsWith('sha-44dfa01') ? index : manifest;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  const original = global.fetch;
  global.fetch = fetchMock as unknown as typeof fetch;
  try {
    expect(await fetchImageLayers(IMAGE)).toHaveLength(26);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://ghcr.io/token?scope=repository:shunl12324/comfy-portal-cloud-server:pull',
      'https://ghcr.io/v2/shunl12324/comfy-portal-cloud-server/manifests/sha-44dfa01',
      'https://ghcr.io/v2/shunl12324/comfy-portal-cloud-server/manifests/sha256:139ff0e9768e4346516655a9f60a8750cfb6e26232403122df72ce7de96ffc5a',
    ]);
    expect(await fetchImageLayers('docker.io/library/ubuntu')).toBeUndefined();
  } finally {
    global.fetch = original;
  }
});
