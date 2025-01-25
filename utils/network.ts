import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * 判断是否是本地或局域网IP
 */
export async function isLocalOrLanIP(host: string): Promise<boolean> {
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
    return false; // 如果出错，保守起见认为是外部网络
  }
}

/**
 * 构建服务器URL
 */
export async function buildServerUrl(host: string, port: string | number, path: string): Promise<string> {
  const isLocal = await isLocalOrLanIP(host);
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${host}:${port}${path}`;
} 