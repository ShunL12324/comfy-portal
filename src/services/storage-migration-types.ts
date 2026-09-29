/**
 * The migration's own record of what it did.
 *
 * Persisted under `cp-migration-v1` so "what could not be migrated, and why" is
 * an inspectable fact on the device rather than a line in a log that scrolled
 * away. A phase that recorded failures is never marked done, so the next launch
 * retries exactly those items.
 */
export interface PhaseReport {
  state: 'pending' | 'done' | 'partial' | 'failed';
  /** Legacy items brought across on this run. */
  migrated: number;
  /** Files already in the pool but missing from the index, re-indexed on this run. */
  adopted: number;
  /** Items already present at the destination. */
  skipped: number;
  failures: { source: string; reason: string }[];
  notes: string[];
}

export interface MigrationReport {
  version: 1;
  startedAt: string;
  finishedAt?: string;
  phases: {
    workflows: PhaseReport;
    environments: PhaseReport;
    media: PhaseReport;
  };
}

export const MIGRATION_REPORT_KEY = 'cp-migration-v1';

export function emptyPhase(): PhaseReport {
  return { state: 'pending', migrated: 0, adopted: 0, skipped: 0, failures: [], notes: [] };
}

export function note(phase: PhaseReport, text: string) {
  phase.notes.push(text);
}

export function fail(phase: PhaseReport, source: string, reason: string) {
  phase.failures.push({ source, reason });
}

/** Done only when nothing failed; anything else stays retryable next launch. */
export function settle(phase: PhaseReport): PhaseReport {
  if (phase.failures.length === 0) phase.state = 'done';
  else phase.state = phase.migrated + phase.adopted > 0 ? 'partial' : 'failed';
  return phase;
}
