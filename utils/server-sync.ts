import { Model, Server } from '@/types/server';
import * as FileSystem from 'expo-file-system';
import { buildServerUrl, fetchWithAuth } from './network';

export interface ServerStatus {
  isOnline: boolean;
  latency: number;
}

export interface CheckServerOptions {
  timeout?: number; // 超时时间，默认 3000ms
  endpoint?: string; // 检测的端点，默认 '/'
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
    const previewDir = `${FileSystem.documentDirectory}server/${server.id}/models/${folderName}`;
    await FileSystem.makeDirectoryAsync(previewDir, { intermediates: true });
    const previewPath = `${previewDir}/${modelName.split('.')[0]}.webp`;

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

    await FileSystem.writeAsStringAsync(
      previewPath,
      base64,
      { encoding: FileSystem.EncodingType.Base64 }
    );
    return previewPath;
  } catch (error) {
    console.warn('Failed to save preview image:', error);
    return null;
  }
}

/**
 * Scans models from a specific folder in a ComfyUI server
 */
export async function scanServerModelsByFolder(
  server: Server,
  folderName: string,
  isWindowsServer?: boolean,
): Promise<Model[]> {
  const models: Model[] = [];

  try {
    const modelsUrl = await buildServerUrl(server.useSSL, server.host, server.port, `/experiment/models/${folderName}`);
    const modelsResponse = await fetchWithAuth(modelsUrl, server.token);
    if (!modelsResponse.ok) return [];

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
    return [];
  }
}

/**
 * Scans and retrieves specific model types from a ComfyUI server
 */
export async function scanServerModels(
  server: Server,
): Promise<{ models: Model[]; isCPEEnabled: boolean }> {
  const targetFolders = ['checkpoints', 'loras', 'vae', 'diffusion_models', 'text_encoders', 'upscale_models', 'controlnet'];
  let models: Model[] = [];
  let isCPEEnabled = false;

  try {
    // --- Attempt to fetch /system_stats (optional, might fail) ---
    let isWindowsServer = false;
    try {
      const statsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
      const statsResponse = await fetchWithAuth(statsUrl, server.token);
      if (statsResponse.ok) {
        const systemStats = await statsResponse.json() as SystemStats;
        console.log(systemStats);
        isWindowsServer = systemStats.system?.os === 'nt';
      }
    } catch (error) {
      // Removed system stats error log
    }
    // --- End /system_stats attempt ---

    // --- Attempt to fetch /extensions and check for comfy-portal-endpoint ---
    try {
      const extensionsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/extensions');
      const extensionsResponse = await fetchWithAuth(extensionsUrl, server.token);
      if (extensionsResponse.ok) {
        const extensionsData = await extensionsResponse.json();
        if (
          Array.isArray(extensionsData) &&
          extensionsData.some((ext: unknown) => typeof ext === 'string' && ext.includes('comfy-portal-endpoint'))
        ) {
          isCPEEnabled = true;
        }
      }
    } catch (err) {
      // Removed extensions error log
    }
    // --- End /extensions attempt ---

    // --- Continue with existing logic using /experiment/models ---
    const foldersUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/experiment/models');
    const foldersResponse = await fetchWithAuth(foldersUrl, server.token);
    if (!foldersResponse.ok) throw new Error('Failed to get model folders');

    const folders = await foldersResponse.json();

    await Promise.all(folders.map(async (folder: { name: string }) => {
      if (!targetFolders.includes(folder.name)) return;

      const folderModels = await scanServerModelsByFolder(server, folder.name, isWindowsServer);
      models = [...models, ...folderModels];
    }));

    return { models, isCPEEnabled };
  } catch (error) {
    console.error('Failed to scan server models:', error);
    return { models: [], isCPEEnabled: false };
  }
}

/**
 * Checks the status and capabilities of a single ComfyUI server
 * @param server - The server configuration object
 * @returns Promise containing server status information
 * @property {Server['status']} status - Current server status ('online' or 'offline')
 * @property {number} [latency] - Server response time in milliseconds (only if online)
 * @property {Model[]} [models] - Array of available models (only if online)
 * @property {boolean} [CPEEnable] - Indicates if Comfy Portal Endpoint is enabled
 * @remarks
 * This function performs three main operations:
 * 1. Checks server availability using /system_stats endpoint
 * 2. Measures network latency
 * 3. Scans available models if server is online
 * The request will timeout after 5000ms if no response is received
 */
export async function checkServerStatus(
  server: Server,
): Promise<{ status: Server['status']; latency?: number; models?: Model[]; CPEEnable?: boolean }> {
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

    const { models, isCPEEnabled } = await scanServerModels(server);

    return { status: 'online', latency, models, CPEEnable: isCPEEnabled };
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