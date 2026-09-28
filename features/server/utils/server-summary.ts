import type { Server } from '@/features/server/types';
import { counted } from '@/utils/counted';
import { spoken } from '@/utils/spoken';
import { shortGpuName } from '@/features/server/services/server-metrics';

/** Compact hardware summary; identical models retain their reported device count. */
export function serverGpuSummary(gpuNames?: string[], legacyName?: string): string | undefined {
  const names = gpuNames?.length ? gpuNames : legacyName ? [legacyName] : [];
  const counts = new Map<string, number>();
  for (const rawName of names) {
    const name = shortGpuName(rawName) || rawName;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => (count > 1 ? `${count} × ${name}` : name)).join(' · ') || undefined;
}

export type ServerTone = 'ready' | 'busy' | 'offline';

/** The status word and dot shape for the card's facts band. */
export function serverStatus(status: Server['status'], latency?: number): { tone: ServerTone; label: string } {
  if (status === 'refreshing') return { tone: 'busy', label: 'Checking connection' };
  if (status === 'online') return { tone: 'ready', label: `Ready${latency !== undefined ? ` · ${latency} ms` : ''}` };
  return { tone: 'offline', label: 'Offline' };
}

/**
 * How many models the last sync found. Undefined until a sync has run: an
 * unsynced server has no count, not zero models.
 */
export function serverModels(models: Server['models']): ReturnType<typeof counted> | undefined {
  return models ? counted(models.length, 'model', 'models') : undefined;
}

/** Spoken form for the card's accessibility hint. */
export function serverHint(status: { label: string }, models?: { text: string }, cost?: string) {
  return spoken(status.label, models?.text, cost);
}
