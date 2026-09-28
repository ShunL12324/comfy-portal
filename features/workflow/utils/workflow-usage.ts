import type { WorkflowRecord } from '@/features/workflow/types';

function timestamp(date: Date | undefined): number {
  const value = date?.getTime();
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

/** Used workflows first; new, unused workflows follow without changing store order. */
export function compareWorkflowUsage(a: WorkflowRecord, b: WorkflowRecord): number {
  return timestamp(b.lastUsed) - timestamp(a.lastUsed) || timestamp(b.createdAt) - timestamp(a.createdAt);
}

export function workflowUsageLabel(lastUsed?: Date, now = new Date()): string {
  if (!timestamp(lastUsed) || !lastUsed) return 'Not run yet';
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day(lastUsed) === day(now)) return 'Used today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day(lastUsed) === day(yesterday)) return 'Used yesterday';
  return `Used ${lastUsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(lastUsed.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  })}`;
}
