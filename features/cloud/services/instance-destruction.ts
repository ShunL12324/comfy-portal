import { destroyCloudInstance, listCloudInstances } from './provider';
import { launchKey, provisioningStorage, useProvisioningStore } from '../stores/provisioning-store';
import { useServersStore } from '@/features/server/stores/server-store';
import type { CloudCredentials } from '../stores/credentials-store';
import type { CloudProvider } from '../types';

type DestructionResult = { cleanupWarning?: string };
// Retain in-memory evidence across retries, scoped to the same authenticated account.
const observedAccounts = new Map<string, string>();
const pending = new Map<string, Promise<DestructionResult>>();
export const isInstanceDestroying = (id: string) => pending.has(id);

/** Do not discard the only local record of a billable instance before the provider succeeds. */
export function destroyManagedInstance(
  instance: { provider: CloudProvider; instanceId: string }, credentials: CloudCredentials,
): Promise<DestructionResult> {
  const id = launchKey(instance);
  const existing = pending.get(id);
  if (existing) return existing;
  const operation = Promise.resolve().then(async () => {
    const exists = async () => (await listCloudInstances(instance.provider, credentials))
      .some(item => item.instanceId === instance.instanceId);
    const account = instance.provider === 'runpod' ? credentials.runpodApiKey : credentials.vastApiKey;
    if (await exists()) {
      observedAccounts.set(id, account);
      let requestError: unknown;
      try { await destroyCloudInstance(instance.provider, instance.instanceId, credentials); }
      catch (error) { requestError = error; }
      let confirmed = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        try { if (!(await exists())) { confirmed = true; break; } }
        catch { throw new Error('Unable to confirm destruction with the provider. The instance may still be running. Retry to check again.'); }
        if (requestError) throw requestError;
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (!confirmed) throw new Error('The provider has not confirmed destruction yet. The instance is still listed. Retry to check again.');
    } else if (!observedAccounts.has(id) || observedAccounts.get(id) !== account) {
      throw new Error('This instance was not found on the selected provider account. Check the account before confirming destruction.');
    }
    try {
      await removeLocalInstanceRecord(instance);
      return {};
    } catch {
      return { cleanupWarning: 'The instance was destroyed, but local records could not be fully saved. Recheck the server list after restarting the app.' };
    }
  }).finally(() => pending.delete(id));
  pending.set(id, operation);
  return operation;
}

/** Forget an explicitly selected local record; never contact or modify the provider. */
export async function removeLocalInstanceRecord(instance: { provider: CloudProvider; instanceId: string }): Promise<void> {
  const id = launchKey(instance);
  useProvisioningStore.getState().remove(id);
  const servers = useServersStore.getState();
  servers.servers.filter(server => server.cloud && launchKey(server.cloud) === id)
    .forEach(server => servers.removeServer(server.id));
  await provisioningStorage.flush();
}
