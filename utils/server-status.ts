import { Model, Server } from '@/types/server';
import * as FileSystem from 'expo-file-system';
import { fetch } from 'expo/fetch';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { buildServerUrl } from './network';

export interface ServerStatus {
  isOnline: boolean;
  latency: number;
}

export interface CheckServerOptions {
  timeout?: number; // 超时时间，默认 3000ms
  endpoint?: string; // 检测的端点，默认 '/'
}

// 判断是否是本地或局域网IP
async function isLocalOrLanIP(host: string): Promise<boolean> {
  // 移除可能的端口号
  const ip = host.split(':')[0];

  // 检查是否是本地地址
  if (ip === 'localhost' || ip === '127.0.0.1') return true;

  try {
    // 获取当前网络信息
    const netInfo = await NetInfo.fetch();

    // 如果不是 WiFi 或以太网连接，则认为是外部网络
    if (netInfo.type !== 'wifi' && netInfo.type !== 'ethernet') {
      return false;
    }

    // 在 WiFi 连接下检查是否在同一子网
    if (netInfo.type === 'wifi' && Platform.OS === 'ios') {
      const details = netInfo.details;
      if (details && 'ipAddress' in details && details.ipAddress) {
        const deviceIP = details.ipAddress;
        const deviceSubnet = deviceIP.split('.').slice(0, 3).join('.');
        const targetSubnet = ip.split('.').slice(0, 3).join('.');

        // 如果在同一子网内，认为是局域网地址
        if (deviceSubnet === targetSubnet) {
          return true;
        }
      }
    }

    // RFC 1918 私有地址范围检查
    const parts = ip.split('.');
    if (parts.length === 4) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);

      // 10.0.0.0 - 10.255.255.255
      if (first === 10) return true;

      // 172.16.0.0 - 172.31.255.255
      if (first === 172 && second >= 16 && second <= 31) return true;

      // 192.168.0.0 - 192.168.255.255
      if (first === 192 && second === 168) return true;
    }

    // 检查是否是 .local 域名（Bonjour/mDNS）
    if (ip.endsWith('.local')) return true;

    return false;
  } catch (error) {
    console.log('[Network] Error checking network info:', error);
    return false; // 如果出错，保守起见认为是外部网络
  }
}

/**
 * Scans and retrieves all models from a ComfyUI server
 * @param server - The server configuration object
 * @returns Promise containing an array of Model objects
 * @throws Error if unable to fetch model folders
 */
export async function scanServerModels(server: Server): Promise<Model[]> {
  const models: Model[] = [];
  try {
    const url = await buildServerUrl(server.host, server.port, '/experiment/models');
    const foldersResponse = await fetch(url, { method: 'GET' });
    if (!foldersResponse.ok) throw new Error('Failed to get model folders');
    const folders = await foldersResponse.json();

    for (const folder of folders) {
      const folderName = folder.name;
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
 * Checks the status of a single ComfyUI server
 * @param server - The server configuration object
 * @returns Promise containing server status, latency, and available models
 */
export async function checkServerStatus(
  server: Server,
): Promise<{ status: Server['status']; latency?: number; models?: Model[] }> {
  console.log(`[Server Check] Starting status check for server: ${server.host}:${server.port}`);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[Server Check] Request timeout after 5000ms`);
    controller.abort()
  }, 5000);

  try {
    console.log(`[Server Check] Sending request to /system_stats endpoint...`);
    const url = await buildServerUrl(server.host, server.port, '/system_stats');
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    console.log(`[Server Check] Response status: ${response.status}`);
    if (!response.ok) {
      console.log(`[Server Check] Server returned error status: ${response.status}`);
      return { status: 'offline' };
    }

    const latency = Date.now() - startTime;
    console.log(`[Server Check] Server is online. Latency: ${latency}ms`);

    console.log(`[Server Check] Starting model scan...`);
    const models = await scanServerModels(server);
    console.log(`[Server Check] Found ${models.length} models`);

    return { status: 'online', latency, models };
  } catch (error) {
    clearTimeout(timeoutId);
    console.log(`[Server Check] Error occurred:`, error);
    return { status: 'offline' };
  }
}

/**
 * Checks the status of multiple ComfyUI servers in parallel
 */
export async function checkMultipleServers(servers: Server[]) {
  return Promise.all(
    servers.map(async (server) => {
      const result = await checkServerStatus(server);
      return { id: server.id, ...result };
    }),
  );
}