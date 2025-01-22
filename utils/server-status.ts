import { fetch } from 'expo/fetch';

export interface ServerStatus {
  isOnline: boolean;
  latency: number;
}

export interface CheckServerOptions {
  timeout?: number; // 超时时间，默认 3000ms
  endpoint?: string; // 检测的端点，默认 '/'
}

/**
 * 检测服务器状态和延迟
 * @param domain 服务器域名
 * @param port 服务器端口
 * @param options 配置选项
 * @returns Promise<ServerStatus>
 */
export async function checkServerStatus(
  domain: string,
  port: number,
  options: CheckServerOptions = {}
): Promise<ServerStatus> {
  const { timeout = 3000, endpoint = '/' } = options;
  const url = `http://${domain}:${port}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = Date.now();

    await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const latency = endTime - startTime;

    return {
      isOnline: true,
      latency,
    };
  } catch (error) {
    // 如果是超时或者其他错误，都认为服务器离线
    return {
      isOnline: false,
      latency: 0,
    };
  }
}

/**
 * 批量检测多个服务器状态
 * @param servers 服务器配置数组
 * @param options 配置选项
 * @returns Promise<Record<string, ServerStatus>>
 */
export async function checkMultipleServers(
  servers: Array<{ id: string; domain: string; port: number }>,
  options?: CheckServerOptions
): Promise<Record<string, ServerStatus>> {
  const results: Record<string, ServerStatus> = {};

  await Promise.all(
    servers.map(async (server) => {
      results[server.id] = await checkServerStatus(
        server.domain,
        server.port,
        options
      );
    })
  );

  return results;
} 