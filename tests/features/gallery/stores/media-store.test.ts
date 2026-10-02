import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  compactEmbeddedWorkflows,
  externalizeWorkflows,
  getAssetWorkflow,
  mediaKind,
  mediaStorage,
  useMediaStore,
} from '@/features/gallery/stores/media-store';
import {
  WORKFLOW_SNAPSHOT_PREFIX,
  resetWorkflowSnapshotsForTest,
} from '@/features/gallery/services/workflow-snapshots';

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
  expect(useMediaStore.getState().assets[0].metadata.workflow!['1'].inputs.seed).toBe(42);
});

describe('index version 0 → 1', () => {
  const graph = (seed: number) => ({
    '3': { class_type: 'KSampler', inputs: { seed, steps: 20, model: ['4', 0] }, _meta: { title: 'KSampler' } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
  });

  /** A gallery as version 0 wrote it: every asset embeds its workflow, some empty, some absent. */
  const legacyGallery = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `legacy-${i}`,
      serverId: i % 7 ? 'server' : 'deleted-server',
      workflowId: 'binding',
      kind: i % 5 ? 'image' : 'video',
      // Some files are long gone; their entries must still survive the migration.
      path: `file:///docs/media-v2/${i % 11 ? '' : 'missing-'}${i}.png`,
      metadata: {
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, count - i)).toISOString(),
        ...(i % 13 === 0 ? {} : { workflow: i % 9 === 0 ? {} : graph(Math.floor(i / 4)) }),
        originalUrl: `https://server/view?filename=${i}.png`,
        promptId: `prompt-${Math.floor(i / 4)}`,
        sourceId: JSON.stringify([`${i}.png`, '', 'output']),
        producedBy: { serverId: 'server', workflowName: 'Portrait' },
      },
    }));
  type LegacyAsset = ReturnType<typeof legacyGallery>[number];

  const embedded = (asset: LegacyAsset) => {
    const workflow = (asset.metadata as { workflow?: object }).workflow;
    return workflow && Object.keys(workflow).length ? workflow : undefined;
  };
  const writeLegacy = (assets: unknown[]) =>
    AsyncStorage.setItem('cp-media-v2', JSON.stringify({ state: { assets }, version: 0 }));
  const snapshotKeys = async () =>
    (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(WORKFLOW_SNAPSHOT_PREFIX));

  beforeEach(async () => {
    await mediaStorage.flush();
    await AsyncStorage.clear();
    resetWorkflowSnapshotsForTest();
  });

  test('moves every embedded workflow into snapshots, losslessly', async () => {
    const legacy = legacyGallery(300);
    await writeLegacy(legacy);
    await useMediaStore.persist.rehydrate();

    const assets = useMediaStore.getState().assets;
    expect(assets.map((asset) => asset.id).sort()).toEqual(legacy.map((asset) => asset.id).sort());
    for (const asset of assets) {
      const before = legacy.find((item) => item.id === asset.id)!;
      expect('workflow' in asset.metadata).toBe(false);
      const { workflow: _workflow, ...rest } = before.metadata as LegacyAsset['metadata'] & { workflow?: object };
      expect(asset.metadata).toMatchObject(rest);
      expect(asset.path).toBe(before.path);
      expect(await getAssetWorkflow(asset)).toEqual(embedded(before));
    }
    // One snapshot per distinct graph, not per asset.
    const distinct = new Set(legacy.flatMap((asset) => (embedded(asset) ? [JSON.stringify(embedded(asset))] : [])));
    expect(await snapshotKeys()).toHaveLength(distinct.size);

    // The migrated index is what is on disk, at version 1.
    await mediaStorage.flush();
    const stored = JSON.parse((await AsyncStorage.getItem('cp-media-v2'))!);
    expect(stored.version).toBe(1);
    expect(stored.state.assets).toHaveLength(300);
    expect(JSON.stringify(stored)).not.toContain('KSampler');
  });

  test('is idempotent: re-running on old or migrated data changes nothing', async () => {
    const legacy = legacyGallery(40);
    await writeLegacy(legacy);
    await useMediaStore.persist.rehydrate();
    const first = useMediaStore.getState().assets;
    const keys = await snapshotKeys();

    // A crash before the migrated index was written leaves the old one behind.
    await mediaStorage.flush();
    resetWorkflowSnapshotsForTest();
    await writeLegacy(legacy);
    await useMediaStore.persist.rehydrate();
    expect(useMediaStore.getState().assets).toEqual(first);
    expect((await snapshotKeys()).sort()).toEqual(keys.sort());

    // Migrated data passes through untouched.
    expect(await externalizeWorkflows(first)).toBe(first);
    await mediaStorage.flush();
    await useMediaStore.persist.rehydrate();
    expect(useMediaStore.getState().assets).toEqual(first);
  });

  test('keeps workflows embedded when snapshots cannot be written, and moves them later', async () => {
    const legacy = legacyGallery(20);
    await writeLegacy(legacy);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const multiSet = jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('disk full'));
    await useMediaStore.persist.rehydrate();
    expect(useMediaStore.persist.hasHydrated()).toBe(true);
    const assets = useMediaStore.getState().assets;
    expect(assets).toHaveLength(20);
    expect(assets.filter((asset) => asset.metadata.workflow).length).toBeGreaterThan(0);
    for (const asset of assets) {
      expect(await getAssetWorkflow(asset)).toEqual(embedded(legacy.find((item) => item.id === asset.id)!));
    }

    // The next launch's storage pass finishes the job.
    expect(await compactEmbeddedWorkflows()).toBeGreaterThan(0);
    expect(useMediaStore.getState().assets.every((asset) => !('workflow' in asset.metadata))).toBe(true);
    for (const asset of useMediaStore.getState().assets) {
      expect(await getAssetWorkflow(asset)).toEqual(embedded(legacy.find((item) => item.id === asset.id)!));
    }
    expect(await compactEmbeddedWorkflows()).toBe(0);
    multiSet.mockRestore();
    warn.mockRestore();
  });

  test('a hold defers index writes until it is released', async () => {
    await useMediaStore.persist.rehydrate();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setItem.mockClear();
    const release = mediaStorage.hold();
    useMediaStore.setState({ assets: [] });
    useMediaStore.setState({ assets: [] });
    await Promise.resolve();
    expect(setItem).not.toHaveBeenCalled();
    release();
    await mediaStorage.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
  });
});
