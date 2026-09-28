import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import type { Environment } from '@/features/cloud/types';
import { environmentContentSchema } from '@/features/cloud/utils/environment-io';
import { materializeWorkflows, useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import type { WorkflowAsset, WorkflowBinding, WorkflowRecord } from '@/features/workflow/types';
import { generateUUID } from '@/utils/uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PhaseReport } from './storage-migration-types';
import { note, fail } from './storage-migration-types';

/**
 * The renamed AsyncStorage keys.
 *
 * The old keys are read and never written or cleared: they stay on the device
 * as a read-only fallback if a migrated store ever has to be inspected.
 */
export const LEGACY_WORKFLOWS_KEY = 'workflows-storage';
export const LEGACY_TEMPLATES_KEY = 'gpu-templates';

interface Hydratable {
  persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void };
}

/** Writing before rehydration finishes would be silently overwritten by it. */
export function whenHydrated(store: Hydratable): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Read one zustand-persist envelope (`{ state, version }`) defensively. */
async function readLegacy<T>(key: string, pick: (state: any) => T | undefined): Promise<T | undefined> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return pick(parsed?.state ?? parsed);
  } catch {
    return undefined;
  }
}

function isoOr(value: unknown, fallback: string): string {
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

/**
 * `workflows-storage` (a flat `WorkflowRecord[]`) into `cp-workflows-v2`
 * (reusable assets plus per-server bindings).
 *
 * The old record id becomes the **binding** id rather than the asset id. Saved
 * media carries it as `workflowId`, and the run/history routes are addressed by
 * it, so reusing it is what keeps existing history pointing at the right
 * workflow after the migration.
 */
export async function migrateWorkflows(
  report: PhaseReport,
  relocateThumbnail: (uri: string) => Promise<string | undefined>,
): Promise<void> {
  const records = await readLegacy<WorkflowRecord[]>(LEGACY_WORKFLOWS_KEY, (state) => state?.workflow);
  if (!records?.length) {
    note(report, records ? 'legacy key held no workflows' : 'no legacy workflows-storage key on this device');
    return;
  }

  await whenHydrated(useWorkflowStore as unknown as Hydratable);
  const current = useWorkflowStore.getState();
  const known = new Set(current.bindings.map((binding) => binding.id));
  const assets: WorkflowAsset[] = [...current.assets];
  const bindings: WorkflowBinding[] = [...current.bindings];

  for (const record of records) {
    try {
      if (!record?.id || !record?.name) {
        fail(report, String(record?.id ?? 'unknown'), 'record is missing an id or a name');
        continue;
      }
      if (known.has(record.id)) {
        report.skipped += 1;
        continue;
      }

      let thumbnail = record.thumbnail;
      if (thumbnail) {
        const relocated = await relocateThumbnail(thumbnail);
        if (relocated === undefined) {
          note(report, `workflow "${record.name}" (${record.id}): thumbnail file was already gone, cleared the field`);
          thumbnail = undefined;
        } else {
          thumbnail = relocated;
        }
      }

      const createdAt = isoOr(record.createdAt, new Date().toISOString());
      const asset: WorkflowAsset = {
        id: generateUUID(),
        name: record.name,
        data: JSON.parse(JSON.stringify(record.data ?? {})),
        ...(thumbnail ? { thumbnail } : {}),
        createdAt,
        updatedAt: createdAt,
      };
      bindings.push({
        id: record.id,
        assetId: asset.id,
        serverId: record.serverId,
        addMethod: record.addMethod,
        ...(record.lastUsed ? { lastUsed: isoOr(record.lastUsed, createdAt) } : {}),
        ...(record.metadata ? { metadata: JSON.parse(JSON.stringify(record.metadata)) } : {}),
      });
      assets.push(asset);
      report.migrated += 1;
    } catch (error) {
      fail(report, String(record?.id ?? 'unknown'), String(error));
    }
  }

  useWorkflowStore.setState({ assets, bindings, workflow: materializeWorkflows(assets, bindings) });
}

/**
 * `gpu-templates` into `cp-environments-v2`.
 *
 * `disk` and `gpuQuery` are dropped on purpose: under the current model
 * hardware belongs to a launch, not to a portable environment recipe. Each drop
 * is recorded per template so the report shows a deliberate semantic change
 * rather than silent data loss.
 */
export async function migrateEnvironments(report: PhaseReport): Promise<void> {
  const templates = await readLegacy<any[]>(LEGACY_TEMPLATES_KEY, (state) => state?.templates);
  if (!templates?.length) {
    note(report, templates ? 'legacy key held no templates' : 'no legacy gpu-templates key on this device');
    return;
  }

  await whenHydrated(useEnvironmentStore as unknown as Hydratable);
  const environments: Environment[] = [...useEnvironmentStore.getState().environments];
  const known = new Set(environments.map((environment) => environment.id));

  for (const template of templates) {
    const label = `template "${template?.name ?? 'unnamed'}" (${template?.id ?? 'no id'})`;
    try {
      if (!template?.id) {
        fail(report, label, 'template is missing an id');
        continue;
      }
      if (known.has(template.id)) {
        report.skipped += 1;
        continue;
      }
      const content = environmentContentSchema.parse({
        ...template,
        description: typeof template.description === 'string' ? template.description : '',
      });
      const createdAt = isoOr(template.createdAt, new Date().toISOString());
      environments.push({
        ...content,
        id: template.id,
        createdAt,
        updatedAt: isoOr(template.updatedAt, createdAt),
      });
      report.migrated += 1;

      const dropped = [
        template.disk !== undefined ? `disk=${template.disk}` : undefined,
        template.gpuQuery !== undefined ? `gpuQuery=${JSON.stringify(template.gpuQuery)}` : undefined,
      ].filter(Boolean);
      if (dropped.length) {
        note(report, `${label}: dropped ${dropped.join(', ')} — hardware belongs to a launch, not an environment`);
      }
    } catch (error) {
      fail(report, label, String(error));
    }
  }

  useEnvironmentStore.setState({ environments });
}
