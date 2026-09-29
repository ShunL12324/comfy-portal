import { destroyManagedInstance, isInstanceDestroying, removeLocalInstanceRecord } from '@/features/cloud/services/instance-destruction';
import { destroyCloudInstance, listCloudInstances } from '@/features/cloud/services/provider';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { useServersStore } from '@/features/server/stores/server-store';

jest.mock('@/features/cloud/services/provider', () => ({ destroyCloudInstance: jest.fn(), listCloudInstances: jest.fn() }));
jest.mock('@/features/cloud/stores/provisioning-store', () => ({
  launchKey: (item: any) => `${item.provider}:${item.instanceId}`,
  provisioningStorage: { flush: jest.fn().mockResolvedValue(undefined) },
  useProvisioningStore: { getState: () => ({ remove: mockRemove }) },
}));
jest.mock('@/features/server/stores/server-store', () => ({
  useServersStore: { getState: () => ({ servers: [
    { id: 'matching', cloud: { provider: 'vast', instanceId: '42' } },
    { id: 'other-provider', cloud: { provider: 'runpod', instanceId: '42' } },
  ], removeServer: mockRemoveServer }) },
}));
const mockRemove = jest.fn();
const mockRemoveServer = jest.fn();
const target = { provider: 'vast' as const, instanceId: '42' };
const credentials = { vastApiKey: 'test-only' } as any;
beforeEach(() => jest.resetAllMocks());
test('holds record during request and confirms absence before cleanup; deduplicates taps', async () => {
  let finish!: () => void;
  jest.mocked(listCloudInstances).mockResolvedValueOnce([target] as any).mockResolvedValueOnce([]);
  jest.mocked(destroyCloudInstance).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const first = destroyManagedInstance(target, credentials);
  expect(destroyManagedInstance(target, credentials)).toBe(first);
  expect(isInstanceDestroying('vast:42')).toBe(true);
  await Promise.resolve(); await Promise.resolve();
  expect(useProvisioningStore.getState().remove).not.toHaveBeenCalled();
  finish(); await first;
  expect(mockRemove).toHaveBeenCalledWith('vast:42');
  expect(useServersStore.getState().removeServer).toHaveBeenCalledTimes(1);
  expect(mockRemoveServer).toHaveBeenCalledWith('matching');
  expect(isInstanceDestroying('vast:42')).toBe(false);
});
test('rejected destruction preserves the record and allows retry', async () => {
  jest.mocked(listCloudInstances).mockResolvedValue([target] as any);
  jest.mocked(destroyCloudInstance).mockRejectedValue(new Error('Provider rejected destruction'));
  await expect(destroyManagedInstance(target, credentials)).rejects.toThrow('Provider rejected');
  expect(mockRemove).not.toHaveBeenCalled();
  expect(mockRemoveServer).not.toHaveBeenCalled();
  expect(isInstanceDestroying('vast:42')).toBe(false);
});
test('verification failure never reports success or removes the record', async () => {
  jest.mocked(listCloudInstances).mockResolvedValueOnce([target] as any).mockRejectedValueOnce(new Error('Offline'));
  jest.mocked(destroyCloudInstance).mockResolvedValue();
  await expect(destroyManagedInstance(target, credentials)).rejects.toThrow('Unable to confirm');
  expect(mockRemove).not.toHaveBeenCalled();
});
test('retry after a lost response confirms absence without another delete', async () => {
  const retryCredentials = { vastApiKey: 'independent-retry-account' } as any;
  jest.mocked(listCloudInstances).mockResolvedValueOnce([target] as any).mockRejectedValueOnce(new Error('Lost response'));
  jest.mocked(destroyCloudInstance).mockResolvedValue();
  await expect(destroyManagedInstance(target, retryCredentials)).rejects.toThrow('Unable to confirm');
  jest.mocked(destroyCloudInstance).mockClear();
  jest.mocked(listCloudInstances).mockResolvedValue([]);
  await destroyManagedInstance(target, retryCredentials);
  expect(destroyCloudInstance).not.toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalledWith('vast:42');
});

test('an absent ID on an unverified account is not proof of successful destruction', async () => {
  jest.mocked(listCloudInstances).mockResolvedValue([]);
  await expect(destroyManagedInstance({ provider: 'vast', instanceId: '999' }, credentials)).rejects.toThrow('not found');
  expect(mockRemove).not.toHaveBeenCalled();
});

test('explicit local removal needs no provider access and preserves other connections', async () => {
  await removeLocalInstanceRecord(target);
  expect(listCloudInstances).not.toHaveBeenCalled();
  expect(destroyCloudInstance).not.toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalledWith('vast:42');
  expect(mockRemoveServer).toHaveBeenCalledTimes(1);
  expect(mockRemoveServer).toHaveBeenCalledWith('matching');
});
