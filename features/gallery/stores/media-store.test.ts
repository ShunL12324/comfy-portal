import { mediaKind, useMediaStore } from './media-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

test('ComfyUI view URLs classify videos using their filename query', () => {
  expect(mediaKind('https://server/view?filename=output.MP4&type=output')).toBe('video');
  expect(mediaKind('file:///media/output.mov')).toBe('video');
  expect(mediaKind('https://server/view?filename=still.png')).toBe('image');
});
test('gallery metadata owns its graph snapshot', async () => {
  await useMediaStore.persist.rehydrate();
  useMediaStore.setState({ assets: [] });
  const asset = {
    id: 'media',
    serverId: 'removed-server',
    workflowId: 'removed-binding',
    kind: 'image' as const,
    path: 'file:///media-v2/media.png',
    metadata: {
      timestamp: '2026-09-11T00:00:00Z',
      originalUrl: 'https://server/view',
      workflow: { '1': { id: '1', class_type: 'KSampler', inputs: { seed: 42 }, _meta: undefined } },
    },
  };
  useMediaStore.getState().upsert(asset);
  asset.metadata.workflow['1'].inputs.seed = 99;
  expect(useMediaStore.getState().assets[0].metadata.workflow['1'].inputs.seed).toBe(42);
});
