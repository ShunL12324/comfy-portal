import { Model, Server } from '@/types/server';
import * as FileSystem from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { buildServerUrl } from './network';

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
    const base64 = btoa(String.fromCharCode(...bytes));

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
    const modelsResponse = await fetch(modelsUrl);
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
          `/experiment/models/preview/${folderName}/${model.pathIndex}/${model.name}`,
        );
        const previewResponse = await fetch(previewUrl);

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
export async function scanServerModels(server: Server): Promise<Model[]> {
  const targetFolders = ['checkpoints', 'loras', 'vae', 'diffusion_models', 'text_encoders'];
  let models: Model[] = [];

  try {
    // First check system stats to determine OS type
    let isWindowsServer = false;
    const statsUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');

    try {
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const stats = await statsResponse.json() as SystemStats;
        isWindowsServer = stats.system?.os === 'nt';
      }
    } catch (error) {
      console.warn('Failed to get system stats, assuming non-Windows OS:', error);
    }

    const foldersUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/experiment/models');
    const foldersResponse = await fetch(foldersUrl);
    if (!foldersResponse.ok) throw new Error('Failed to get model folders');

    const folders = await foldersResponse.json();

    await Promise.all(folders.map(async (folder: { name: string }) => {
      if (!targetFolders.includes(folder.name)) return;

      const folderModels = await scanServerModelsByFolder(server, folder.name, isWindowsServer);
      models = [...models, ...folderModels];
    }));

    return models;
  } catch (error) {
    console.error('Failed to scan server models:', error);
    return [];
  }
}

/**
 * Checks the status and capabilities of a single ComfyUI server
 * @param server - The server configuration object
 * @returns Promise containing server status information
 * @property {Server['status']} status - Current server status ('online' or 'offline')
 * @property {number} [latency] - Server response time in milliseconds (only if online)
 * @property {Model[]} [models] - Array of available models (only if online)
 * @remarks
 * This function performs three main operations:
 * 1. Checks server availability using /system_stats endpoint
 * 2. Measures network latency
 * 3. Scans available models if server is online
 * The request will timeout after 5000ms if no response is received
 */
export async function checkServerStatus(
  server: Server,
): Promise<{ status: Server['status']; latency?: number; models?: Model[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
    const startTime = Date.now();
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const latency = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (!response.ok) return { status: 'offline' };

    const models = await scanServerModels(server);
    return { status: 'online', latency, models };
  } catch (error) {
    clearTimeout(timeoutId);
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