import { mediaKind, mediaStorage, useMediaStore, waitForMediaHydration } from '@/features/gallery/stores/media-store';
import type { MediaAsset, MediaProvenance } from '@/features/gallery/stores/media-store';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { mediaTime, resolveMediaTimestamp } from '@/features/gallery/utils/media-time';
import { generateUUID } from '@/utils/uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { migrateEnvironments, migrateWorkflows } from './storage-migration-stores';
import type { MigrationReport, PhaseReport } from './storage-migration-types';
import { MIGRATION_REPORT_KEY, emptyPhase, fail, note, settle } from './storage-migration-types';

/**
 * Bring storage written by older versions into the current model.
 *
 * The model: generated media is one pool. It records which machine and which
 * workflow produced it, and nothing else owns it — deleting either must leave
 * the images and videos in place and visible.
 *
 * Older versions stored media *inside* the machine, at
 * `server/<serverId>/workflows/<workflowId>/generated/`, which is why deleting
 * a connection used to destroy it. This moves every such file into the pool at
 * `media-v2/` and indexes it in `cp-media-v2`.
 *
 * Nothing here deletes a media file. Ever. A file whose move or indexing fails
 * is left exactly where it is for the next run to retry, and the only
 * directories removed are ones already observed to be empty.
 */

const POOL_DIR = 'media-v2';
const THUMBNAIL_DIR = 'workflow-thumbnails-v2';
const LEGACY_ROOT = 'server';

const MEDIA_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm', 'm4v'];

/** Legacy media filename: `<ISO timestamp>-<uuid>.<ext>`. */
const LEGACY_NAME = /^(.+?Z)-[0-9a-f-]{36}\.[a-z0-9]+$/i;

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? 'png';
}

function isMediaFile(name: string): boolean {
  return MEDIA_EXTENSIONS.includes(extensionOf(name));
}

function directoryUri(dir: Directory): string {
  return dir.uri.replace(/\/?$/, '/');
}

/**
 * Provenance for a file found on disk.
 *
 * The path segments are the only record of origin the old layout kept, so they
 * are the ids. Names are looked up best-effort and may legitimately be missing:
 * the user may have deleted that server or workflow long ago, which is exactly
 * the case this whole task exists to support.
 */
function provenanceFromPath(serverId: string, workflowId: string): MediaProvenance {
  const server = useServersStore.getState().servers.find((item) => item.id === serverId);
  const { assets, bindings } = useWorkflowStore.getState();
  const binding = bindings.find((item) => item.id === workflowId);
  const asset = binding ? assets.find((item) => item.id === binding.assetId) : undefined;
  return {
    serverId,
    ...(server?.name ? { serverName: server.name } : {}),
    workflowBindingId: workflowId,
    ...(binding ? { workflowAssetId: binding.assetId } : {}),
    ...(asset?.name ? { workflowName: asset.name } : {}),
  };
}

/** When the file system says a file was made, in epoch milliseconds; nothing if it cannot tell. */
function fileTime(file: File): number | undefined {
  try {
    return file.creationTime ?? file.modificationTime ?? undefined;
  } catch {
    return undefined;
  }
}

function metadataFrom(sidecarText: string | undefined, file: File, fallbackProvenance: MediaProvenance) {
  let parsed: any;
  if (sidecarText) {
    try {
      parsed = JSON.parse(sidecarText);
    } catch {
      parsed = undefined;
    }
  }
  // Without a sidecar the old filename still carries the generation time, and
  // failing that the file's own date does, so ordering survives even for
  // assets whose metadata was lost. Adoption used to stamp those with the
  // epoch, and every orphaned pool file then read as made in 1970.
  return {
    timestamp: resolveMediaTimestamp({
      recorded: parsed?.timestamp,
      fromName: LEGACY_NAME.exec(file.name)?.[1],
      fileTime: fileTime(file),
    }),
    workflow: parsed?.workflow ?? {},
    // Left empty when unknown rather than guessed: job recovery de-duplicates
    // on this value, and a wrong one would suppress a real download.
    originalUrl: typeof parsed?.originalUrl === 'string' ? parsed.originalUrl : '',
    ...(parsed?.sourceId ? { sourceId: parsed.sourceId } : {}),
    ...(parsed?.promptId ? { promptId: parsed.promptId } : {}),
    // A pool sidecar already carries provenance; a legacy one never does, and
    // for those the path the file came from is the only record of it.
    producedBy: parsed?.producedBy ?? fallbackProvenance,
  } satisfies MediaAsset['metadata'];
}

async function readIfPresent(file: File): Promise<string | undefined> {
  try {
    return file.exists ? await file.text() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Re-index pool files that are on disk but missing from `cp-media-v2`.
 *
 * This is what makes an interrupted run safe. A migration moves the sidecar,
 * then the media file, then writes the index; a crash in between leaves the
 * asset in the pool but unindexed — invisible, though not lost. This pass runs
 * before anything else on every launch and claims those files back.
 */
async function adoptOrphans(pool: Directory, report: PhaseReport): Promise<void> {
  if (!pool.exists) return;
  const entries = pool.list();
  const indexed = new Set(useMediaStore.getState().assets.map((asset) => asset.path));
  const present = new Set(entries.filter((entry) => entry instanceof File).map((entry) => entry.name));

  for (const entry of entries) {
    if (!(entry instanceof File)) continue;

    if (entry.name.endsWith('.json')) {
      // Metadata with no asset beside it is debris from a move interrupted
      // before the bytes arrived. That asset is still at its legacy path with
      // its own metadata and will migrate again under a fresh id.
      if (!present.has(entry.name.slice(0, -'.json'.length))) {
        try {
          entry.delete();
        } catch (error) {
          note(report, `could not remove stale pool metadata ${entry.name}: ${error}`);
        }
      }
      continue;
    }

    if (!isMediaFile(entry.name) || indexed.has(entry.uri)) continue;
    try {
      const sidecar = new File(pool, entry.name + '.json');
      const metadata = metadataFrom(await readIfPresent(sidecar), entry, {});
      useMediaStore.getState().upsert({
        id: generateUUID(),
        serverId: metadata.producedBy?.serverId ?? '',
        workflowId: metadata.producedBy?.workflowBindingId ?? '',
        kind: mediaKind(entry.uri),
        path: entry.uri,
        metadata,
      });
      await mediaStorage.flush();
      if (sidecar.exists) sidecar.delete();
      report.adopted += 1;
    } catch (error) {
      fail(report, entry.uri, `adoption failed: ${error}`);
    }
  }
}

/**
 * Move one legacy media file into the pool and index it.
 *
 * Order matters and is the crash-safety contract: the sidecar goes first so a
 * partially moved asset still has its metadata alongside it in the pool, the
 * media file second, the index last. Interrupting at any point leaves the file
 * either untouched at its old path or adoptable at its new one.
 */
async function migrateOne(file: File, generated: Directory, pool: Directory, serverId: string, workflowId: string) {
  const id = generateUUID();
  const targetName = `${id}.${extensionOf(file.name)}`;
  const legacySidecar = new File(generated, file.name + '.json');
  const metadata = metadataFrom(await readIfPresent(legacySidecar), file, provenanceFromPath(serverId, workflowId));

  // Metadata reaches the pool before the bytes do. The path segments are the
  // only record that this file came from a given machine and workflow, and the
  // move erases them, so provenance is written down first — an interrupted move
  // then leaves an asset adoption can still describe in full.
  const poolSidecar = new File(pool, targetName + '.json');
  poolSidecar.create({ intermediates: true, overwrite: true });
  poolSidecar.write(JSON.stringify(metadata), { encoding: 'utf8' });

  await file.move(new File(pool, targetName));
  useMediaStore.getState().upsert({
    id,
    serverId,
    workflowId,
    kind: mediaKind(file.uri),
    path: file.uri,
    metadata,
  });
  await mediaStorage.flush();

  // The index is durable now, so both on-disk copies of the metadata are
  // redundant. The asset itself is never deleted here, only its metadata.
  if (poolSidecar.exists) poolSidecar.delete();
  if (legacySidecar.exists) legacySidecar.delete();
}

/**
 * Re-date indexed assets whose time is unknown, from their file. Earlier
 * adoption passes indexed orphaned files at the epoch; this repairs them in
 * place. Only the timestamp changes, and only where the file can be dated.
 */
async function redateUndatedMedia(report: PhaseReport): Promise<void> {
  const store = useMediaStore.getState();
  const updates = store.assets.filter((asset) => mediaTime(asset.metadata.timestamp) === undefined);
  if (!updates.length) return;
  let redated = 0;
  for (const asset of updates) {
    let time: number | undefined;
    try {
      time = fileTime(new File(asset.path));
    } catch {
      time = undefined;
    }
    if (time === undefined) continue;
    store.upsert({ ...asset, metadata: { ...asset.metadata, timestamp: resolveMediaTimestamp({ fileTime: time }) } });
    redated += 1;
  }
  if (!redated) return;
  await mediaStorage.flush();
  note(report, `re-dated ${redated} undated asset(s) from their files`);
}

async function migrateMedia(pool: Directory, report: PhaseReport): Promise<void> {
  await adoptOrphans(pool, report);
  await redateUndatedMedia(report);

  const legacyRoot = new Directory(Paths.document, LEGACY_ROOT);
  if (!legacyRoot.exists) {
    note(report, 'no legacy server/ directory on this device');
    return;
  }

  for (const serverEntry of legacyRoot.list()) {
    if (!(serverEntry instanceof Directory)) continue;
    const workflowsDir = new Directory(serverEntry, 'workflows');
    if (!workflowsDir.exists) continue;

    for (const workflowEntry of workflowsDir.list()) {
      if (!(workflowEntry instanceof Directory)) continue;
      const generated = new Directory(workflowEntry, 'generated');
      if (!generated.exists) continue;

      for (const entry of generated.list()) {
        if (!(entry instanceof File) || !isMediaFile(entry.name)) continue;
        try {
          await migrateOne(entry, generated, pool, serverEntry.name, workflowEntry.name);
          report.migrated += 1;
        } catch (error) {
          // Deliberately leaves the file where it is; the next run retries it.
          fail(report, entry.uri, String(error));
        }
      }
    }
  }
}

/**
 * Move a workflow thumbnail out of the legacy per-server tree.
 *
 * Old thumbnails sat in `server/<id>/workflows/<id>/thumbnail/` — the same
 * subtree as the media — so a workflow migrated without this would come back
 * with its card image missing. Returns the new uri, the original uri when it
 * was never in that tree, or `undefined` when the file is simply gone.
 */
async function relocateThumbnail(uri: string): Promise<string | undefined> {
  const legacyRoot = directoryUri(new Directory(Paths.document, LEGACY_ROOT));
  // Older records stored the path with and without the scheme.
  const bareRoot = legacyRoot.replace(/^file:\/\//, '');
  if (!uri.startsWith(legacyRoot) && !uri.startsWith(bareRoot)) return uri;
  const source = new File(uri);
  if (!source.exists) return undefined;
  const target = new Directory(Paths.document, THUMBNAIL_DIR);
  target.create({ intermediates: true, idempotent: true });
  await source.move(new File(target, `${generateUUID()}.${extensionOf(uri)}`));
  return source.uri;
}

/**
 * Delete directories of the legacy tree that are already empty.
 *
 * Deepest first, and each one is re-listed immediately before removal. Anything
 * still holding a file is left alone — a leftover empty folder costs nothing,
 * and this task exists because a recursive delete here destroyed real assets.
 */
/**
 * Remove legacy metadata files whose asset has already left.
 *
 * A `<name>.json` with no `<name>` beside it can only mean the media file was
 * moved into the pool and the run was interrupted before its metadata was
 * tidied up — a move is the one thing that takes a file out of that directory.
 * The content is already in `cp-media-v2`. Only reached when the whole pass
 * recorded no failures, and it never touches a file that is not metadata.
 */
function sweepOrphanLegacyMetadata(legacyRoot: Directory, report: PhaseReport): void {
  if (!legacyRoot.exists) return;
  for (const serverEntry of legacyRoot.list()) {
    if (!(serverEntry instanceof Directory)) continue;
    const workflowsDir = new Directory(serverEntry, 'workflows');
    if (!workflowsDir.exists) continue;
    for (const workflowEntry of workflowsDir.list()) {
      if (!(workflowEntry instanceof Directory)) continue;
      const generated = new Directory(workflowEntry, 'generated');
      if (!generated.exists) continue;
      const entries = generated.list();
      const present = new Set(entries.filter((entry) => entry instanceof File).map((entry) => entry.name));
      for (const entry of entries) {
        if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
        if (present.has(entry.name.slice(0, -'.json'.length))) continue;
        try {
          entry.delete();
        } catch (error) {
          note(report, `could not remove stale legacy metadata ${entry.uri}: ${error}`);
        }
      }
    }
  }
}

function sweepEmptyDirectories(dir: Directory): boolean {
  if (!dir.exists) return true;
  let empty = true;
  for (const entry of dir.list()) {
    if (entry instanceof Directory) {
      if (!sweepEmptyDirectories(entry)) empty = false;
    } else {
      empty = false;
    }
  }
  if (!empty) return false;
  if (dir.list().length !== 0) return false;
  dir.delete();
  return true;
}

let inFlight: Promise<MigrationReport> | null = null;

/**
 * Idempotent and re-entrant. Concurrent callers join the same pass, and a
 * completed pass is cheap to repeat: every phase re-derives its work from what
 * is actually still on disk or still absent from the destination.
 */
export function runStorageMigrations(): Promise<MigrationReport> {
  if (!inFlight) inFlight = execute();
  return inFlight;
}

/** Test seam: forget the memoised pass. */
export function resetStorageMigrationsForTest() {
  inFlight = null;
}

async function execute(): Promise<MigrationReport> {
  const report: MigrationReport = {
    version: 1,
    startedAt: new Date().toISOString(),
    phases: { workflows: emptyPhase(), environments: emptyPhase(), media: emptyPhase() },
  };

  // Workflows first: media provenance wants the workflow name, and that only
  // resolves once the bindings the old media ids refer to exist.
  try {
    await migrateWorkflows(report.phases.workflows, relocateThumbnail);
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

  try {
    await waitForMediaHydration();
    const pool = new Directory(Paths.document, POOL_DIR);
    pool.create({ intermediates: true, idempotent: true });
    await migrateMedia(pool, report.phases.media);
  } catch (error) {
    fail(report.phases.media, POOL_DIR, String(error));
  }
  settle(report.phases.media);

  // Only once every asset is accounted for, and only metadata and empty folders.
  if (Object.values(report.phases).every((phase) => phase.failures.length === 0)) {
    try {
      const legacyRoot = new Directory(Paths.document, LEGACY_ROOT);
      sweepOrphanLegacyMetadata(legacyRoot, report.phases.media);
      sweepEmptyDirectories(legacyRoot);
    } catch (error) {
      note(report.phases.media, `leftover empty legacy directories could not be removed: ${error}`);
    }
  }

  report.finishedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(MIGRATION_REPORT_KEY, JSON.stringify(report));
  } catch (error) {
    console.warn('failed to record the storage migration report', error);
  }
  return report;
}

/** The last run's record, for support and for the verification evidence. */
export async function readMigrationReport(): Promise<MigrationReport | undefined> {
  const raw = await AsyncStorage.getItem(MIGRATION_REPORT_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as MigrationReport;
  } catch {
    return undefined;
  }
}
