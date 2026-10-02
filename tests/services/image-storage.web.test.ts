import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssetWorkflow, useMediaStore } from '@/features/gallery/stores/media-store';
import {
  WORKFLOW_SNAPSHOT_PREFIX,
  resetWorkflowSnapshotsForTest,
} from '@/features/gallery/services/workflow-snapshots';
import { beginMediaSaveBatch, deleteGeneratedMedia, saveGeneratedMedia } from '@/services/image-storage.web';

jest.mock('@/features/workflow/stores/workflow-store', () => ({ useWorkflowStore: {} }));
jest.mock('@/services/media-provenance', () => ({ resolveProvenance: () => ({}) }));
let mockUuid = 0;
jest.mock('@/utils/uuid', () => ({ generateUUID: () => `uuid-${++mockUuid}` }));

const workflow = { '3': { class_type: 'KSampler', inputs: { seed: 7 } } } as any;
const options = (n: number) => ({
  serverId: 'server',
  workflowId: 'workflow',
  mediaUrl: `https://server/view?filename=out${n}.png&type=output`,
  workflow,
  promptId: 'prompt',
  sourceId: JSON.stringify([`out${n}.png`, '', 'output']),
});
const indexWrites = () => (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === 'cp-media-v2');
const snapshots = async () =>
  (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(WORKFLOW_SNAPSHOT_PREFIX));

beforeEach(async () => {
  await useMediaStore.persist.rehydrate();
  useMediaStore.setState({ assets: [] });
  await AsyncStorage.clear();
  resetWorkflowSnapshotsForTest();
  (AsyncStorage.setItem as jest.Mock).mockClear();
});

test('web saves a job with one index write and one shared snapshot', async () => {
  const batch = beginMediaSaveBatch();
  for (let n = 0; n < 3; n++) await batch.save(options(n));
  expect(indexWrites()).toHaveLength(0);
  await batch.commit();
  expect(indexWrites()).toHaveLength(1);
  expect(await snapshots()).toHaveLength(1);
  const assets = useMediaStore.getState().assets;
  expect(assets).toHaveLength(3);
  for (const asset of assets) {
    expect(asset.metadata.workflow).toBeUndefined();
    expect(await getAssetWorkflow(asset)).toEqual(workflow);
  }
});

test('web de-duplicates by promptId and sourceId, and deletes drop unused snapshots', async () => {
  const first = await saveGeneratedMedia(options(0));
  const again = await saveGeneratedMedia(options(0));
  expect(again.path).toBe(first.path);
  expect(useMediaStore.getState().assets).toHaveLength(1);
  await deleteGeneratedMedia([first.path]);
  expect(useMediaStore.getState().assets).toEqual([]);
  expect(await snapshots()).toEqual([]);
});
