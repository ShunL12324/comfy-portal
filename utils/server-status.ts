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

/**
 * Scans and retrieves specific model types from a ComfyUI server
 * @param server - The server configuration object
 * @returns Promise containing an array of Model objects from checkpoints and loras folders
 * @throws {Error} If unable to fetch model folders or network request fails
 * @remarks
 * This function only scans 'checkpoints' and 'loras' folders to optimize performance.
 * For each model, it attempts to fetch and store a preview image locally.
 * Preview images are stored in the app's document directory under server/{serverId}/models/{folderName}
 */
export async function scanServerModels(server: Server): Promise<Model[]> {
  const models: Model[] = [];
  const targetFolders = ['checkpoints', 'loras'];

  try {
    const url = await buildServerUrl(server.host, server.port, '/experiment/models');
    const foldersResponse = await fetch(url, { method: 'GET' });
    if (!foldersResponse.ok) throw new Error('Failed to get model folders');
    const folders = await foldersResponse.json();

    for (const folder of folders) {
      const folderName = folder.name;
      if (!targetFolders.includes(folderName)) continue;

      const modelsResponse = await fetch(
        await buildServerUrl(server.host, server.port, `/experiment/models/${folderName}`),
        { method: 'GET' },
      );
      if (!modelsResponse.ok) continue;
      const folderModels = await modelsResponse.json();

      for (const model of folderModels) {
        const previewResponse = await fetch(
          await buildServerUrl(
            server.host,
            server.port,
            `/experiment/models/preview/${folderName}/${model.pathIndex}/${model.name}`,
          ),
          { method: 'GET' },
        );

        if (previewResponse.ok) {
          const previewDir = `${FileSystem.documentDirectory}server/${server.id}/models/${folderName}`;
          await FileSystem.makeDirectoryAsync(previewDir, { intermediates: true });
          const previewPath = `${previewDir}/${model.name.split('.')[0]}.webp`;

          const arrayBuffer = await previewResponse.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...bytes));

          try {
            await FileSystem.writeAsStringAsync(
              previewPath,
              base64,
              { encoding: FileSystem.EncodingType.Base64 }
            );
            models.push({
              name: model.name,
              type: folderName,
              hasPreview: true,
              previewPath,
            });
          } catch (error) {
            models.push({ name: model.name, type: folderName, hasPreview: false });
          }
        } else {
          models.push({ name: model.name, type: folderName, hasPreview: false });
        }
      }
    }
    return models;
  } catch (error) {
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
    const url = await buildServerUrl(server.host, server.port, '/system_stats');
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