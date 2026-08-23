import { Model, Server } from '@/features/server/types';
import { buildServerUrl, fetchWithAuth } from '@/services/network';
import { Directory, File, Paths } from 'expo-file-system';

export interface ServerStatus {
  isOnline: boolean;
  latency: number;
}

export interface CheckServerOptions {
  timeout?: number; // Timeout in ms, default 3000
  endpoint?: string; // Health check endpoint, default '/'
}

interface SystemStats {
  system: {
    os: string;
    comfyui_version: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ModelResponse {
  name: string;
  pathIndex: number;
  [key: string]: any;
}

/**
 * Saves a preview image to local storage
 */
async function savePreviewImage(
  previewResponse: any,
  server: Server,
  folderName: string,
  modelName: string,
): Promise<string | null> {
  try {
    const previewDir = new Directory(Paths.document, 'server', server.id, 'models', folderName);
    previewDir.create({ intermediates: true, idempotent: true });
    const previewFile = new File(previewDir, `${modelName.split('.')[0]}.webp`);

    const arrayBuffer = await previewResponse.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192; // Process in 8KB chunks to avoid stack overflow

    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const base64 = btoa(binary);

    previewFile.create({ intermediates: true, overwrite: true });
    previewFile.write(base64, { encoding: 'base64' });
    return previewFile.uri;
  } catch (error) {
    console.warn('Failed to save preview image:', error);
    return null;
  }
}

/** Model folders surfaced in the pickers. */
export const TARGET_MODEL_FOLDERS = [
  'checkpoints',
  'loras',
  'vae',
  'diffusion_models',
  'text_encoders',
  'upscale_models',
  'controlnet',
  'clip_vision',
  'clip',
];

interface FolderScanOptions {
  isWindowsServer?: boolean;
  /** This folder's entries from the last successful sync. */
  known?: Model[];
  /** Re-check preview images instead of reusing `known`. */
  refreshPreviews?: boolean;
}

/**
 * Scans one model folder.
 *
 * Returns `null` when the listing itself fails, so callers can tell "the server
 * didn't answer" apart from "this folder is empty" — writing the latter over a
 * good cache is how an entire catalogue could vanish after one flaky request.
 *
 * Preview images are fetched once per model and then reused from `known`. A
 * server with no previews at all is the common case, and it used to cost one
 * 404 round trip per model on every single sync.
 */
export async function scanServerModelsByFolder(
  server: Server,
  folderName: string,
  options: FolderScanOptions = {},
): Promise<Model[] | null> {
  const { isWindowsServer, known = [], refreshPreviews = false } = options;
  const models: Model[] = [];
  const previous = new Map(known.map((model) => [model.name, model]));

  try {
    const modelsUrl = await buildServerUrl(server.useSSL, server.host, server.port, `/experiment/models/${folderName}`);
    const modelsResponse = await fetchWithAuth(modelsUrl, server.token);
    if (!modelsResponse.ok) return null;

    const folderModels = (await modelsResponse.json()) as ModelResponse[];

    for (const model of folderModels) {
      // Validate model object
      if (!model.name || typeof model.pathIndex !== 'number') {
        console.warn('Invalid model data:', model);
        continue;
      }

      // Skip models in subdirectories for checkpoints folder
      if (folderName === 'checkpoints' && (
        model.name.includes('/') || // Unix-style path
        (isWindowsServer && model.name.includes('\\')) // Windows-style path
      )) {
        continue;
      }

      const cached = previous.get(model.name);
      if (cached && !refreshPreviews) {
        models.push(cached);
        continue;
      }

      try {
        const previewUrl = await buildServerUrl(
          server.useSSL,
          server.host,
          server.port,
          `/experiment/models/preview/${folderName}/${model.pathIndex}/${encodeURIComponent(model.name)}`,
        );
        const previewResponse = await fetchWithAuth(previewUrl, server.token);

        if (previewResponse.ok) {
          const previewPath = await savePreviewImage(previewResponse, server, folderName, model.name);
          models.push({
            name: model.name,
            type: folderName,
            hasPreview: Boolean(previewPath),
            ...(previewPath && { previewPath }),
          });
        } else {
          models.push({ name: model.name, type: folderName, hasPreview: false });
        }
      } catch (error) {
        console.warn(`Failed to fetch preview for ${model.name}:`, error);
        models.push({ name: model.name, type: folderName, hasPreview: false });
      }
    }
    return models;
  } catch (error) {
    console.error(`Failed to scan folder ${folderName}:`, error);
    return null;
  }
}

export interface SyncModelsOptions {
  /** Limit the sync to these folders. Defaults to all of TARGET_MODEL_FOLDERS. */
  folders?: string[];
  /** Re-check preview images for models we already know about. */
  refreshPreviews?: boolean;
}

/**
 * Rebuilds a server's model catalogue.
 *
 * Returns `null` when the folder listing can't be reached — the caller must then
 * leave the cache untouched. Previously this returned an empty array on failure,
 * and because `[]` is truthy the store happily wrote it over a perfectly good
 * catalogue, so one dropped request emptied every model picker in the app.
 *
 * Folders that fail individually keep their cached entries too: only folders
 * that scanned cleanly are replaced. Folders outside `options.folders` are
 * carried over untouched, which is what makes a per-picker refresh safe.
 */
export async function syncServerModels(
  server: Server,
  options: SyncModelsOptions = {},
): Promise<Model[] | null> {
  const wanted = options.folders ?? TARGET_MODEL_FOLDERS;
  const cached = server.models ?? [];

  try {
    let isWindowsServer = false;
    try {
      const statsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
      const statsResponse = await fetchWithAuth(statsUrl, server.token);
      if (statsResponse.ok) {
        const systemStats = (await statsResponse.json()) as SystemStats;
        isWindowsServer = systemStats.system?.os === 'nt';
      }
    } catch (error) {
      void error;
    }

    const foldersUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/experiment/models');
    const foldersResponse = await fetchWithAuth(foldersUrl, server.token);
    if (!foldersResponse.ok) return null;

    const folders = (await foldersResponse.json()) as { name: string }[];
    const targets = folders.filter((folder) => wanted.includes(folder.name));

    const results = await Promise.all(
      targets.map(async (folder) => ({
        folder: folder.name,
        models: await scanServerModelsByFolder(server, folder.name, {
          isWindowsServer,
          known: cached.filter((model) => model.type === folder.name),
          refreshPreviews: options.refreshPreviews,
        }),
      })),
    );

    const replaced = new Set(results.filter((result) => result.models).map((result) => result.folder));

    return [
      ...cached.filter((model) => !replaced.has(model.type)),
      ...results.flatMap((result) => result.models ?? []),
    ];
  } catch (error) {
    console.error('Failed to sync server models:', error);
    return null;
  }
}

/** Whether the Comfy Portal Endpoint extension is installed on a server. */
async function detectCPE(server: Server): Promise<boolean> {
  try {
    const extensionsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/extensions');
    const extensionsResponse = await fetchWithAuth(extensionsUrl, server.token);
    if (!extensionsResponse.ok) return false;
    const extensionsData = await extensionsResponse.json();
    return (
      Array.isArray(extensionsData) &&
      extensionsData.some((ext: unknown) => typeof ext === 'string' && ext.includes('comfy-portal-endpoint'))
    );
  } catch (error) {
    void error;
    return false;
  }
}

/**
 * Liveness probe for a single ComfyUI server: reachable, how fast, and whether
 * the Comfy Portal Endpoint extension is installed. Times out after 5000ms.
 *
 * Deliberately does *not* scan models. It used to, which meant every status
 * check — including the one behind pull-to-refresh — dragged a full catalogue
 * scan along with it. Model syncing is now its own operation with its own
 * freshness policy; see `syncServerModels`.
 */
export async function checkServerStatus(
  server: Server,
): Promise<{ status: Server['status']; latency?: number; CPEEnable?: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
    const startTime = Date.now();
    const response = await fetchWithAuth(url, server.token, { method: 'GET', signal: controller.signal });
    const latency = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { status: 'offline' };
    }

    return { status: 'online', latency, CPEEnable: await detectCPE(server) };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`[${server.name}] Server check timed out.`);
    } else {
      console.error(`[${server.name}] Error during server check:`, error);
    }
    return { status: 'offline' };
  }
}

/**
 * Checks the status of multiple ComfyUI servers concurrently
 * @param servers - Array of server configurations to check
 * @returns Promise containing an array of server status results, each with the server's ID
 * @remarks
 * This function uses Promise.all to check all servers in parallel,
 * improving performance when checking multiple servers simultaneously
 */
export async function checkMultipleServers(servers: Server[]) {
  return Promise.all(
    servers.map(async (server) => {
      const result = await checkServerStatus(server);
      return { id: server.id, ...result };
    }),
  );
}
