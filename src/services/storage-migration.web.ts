import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateEnvironments, migrateWorkflows } from './storage-migration-stores';
import type { MigrationReport } from './storage-migration-types';
import { MIGRATION_REPORT_KEY, emptyPhase, fail, note, settle } from './storage-migration-types';

/**
 * Web has no on-disk asset pool to migrate.
 *
 * `services/image-storage.web.ts` persists references to the outputs rather
 * than downloading bytes, so there is no `server/<id>/` tree here and never
 * was. The renamed AsyncStorage keys still need migrating, and those are
 * platform-independent.
 */

let inFlight: Promise<MigrationReport> | null = null;

export function runStorageMigrations(): Promise<MigrationReport> {
  if (!inFlight) inFlight = execute();
  return inFlight;
}

export function resetStorageMigrationsForTest() {
  inFlight = null;
}

async function execute(): Promise<MigrationReport> {
  const report: MigrationReport = {
    version: 1,
    startedAt: new Date().toISOString(),
    phases: { workflows: emptyPhase(), environments: emptyPhase(), media: emptyPhase() },
  };

  // No thumbnail relocation either: web thumbnails are already plain URLs.
  try {
    await migrateWorkflows(report.phases.workflows, async (uri) => uri);
  } catch (error) {
    fail(report.phases.workflows, 'workflows-storage', String(error));
  }
  settle(report.phases.workflows);

  try {
    await migrateEnvironments(report.phases.environments);
  } catch (error) {
    fail(report.phases.environments, 'gpu-templates', String(error));
  }
  settle(report.phases.environments);

  note(report.phases.media, 'web stores output references, not files; there is no legacy asset tree to migrate');
  settle(report.phases.media);

  report.finishedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(MIGRATION_REPORT_KEY, JSON.stringify(report));
  } catch (error) {
    console.warn('failed to record the storage migration report', error);
  }
  return report;
}

export async function readMigrationReport(): Promise<MigrationReport | undefined> {
  const raw = await AsyncStorage.getItem(MIGRATION_REPORT_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as MigrationReport;
  } catch {
    return undefined;
  }
}
