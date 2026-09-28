import type { WorkflowRecord } from '../types';

/** Object key order is not a graph change; array order and numeric values are. */
export function contentKey(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}

export function serverWorkflowFilename(record: WorkflowRecord): string | undefined {
  if (record.addMethod !== 'server-sync') return;
  return record.serverSync?.filename ?? record.metadata?.originalFilename;
}

export function hasLocalWorkflowChanges(record: WorkflowRecord): boolean {
  const base = record.serverSync?.base;
  // Legacy records have no original graph. Never assume they are untouched.
  return !base || record.name !== base.name || contentKey(record.data) !== contentKey(base.data);
}

export function workflowSourceNotice(record: WorkflowRecord): string | undefined {
  if (record.serverSync?.sourceMissing) return 'Source removed';
  if (record.serverSync?.incoming) return 'Update available';
}
