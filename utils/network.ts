import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Determines if a given host address is a local or LAN IP address.
 * This includes localhost, private IP ranges (RFC 1918), and .local domains.
 * 
 * @param {string} host - The hostname or IP address to check
 * @returns {Promise<boolean>} True if the address is local/LAN, false otherwise
 */
export async function isLocalOrLanIP(host: string): Promise<boolean> {
  const ip = host.split(':')[0];
  if (ip === 'localhost' || ip === '127.0.0.1') return true;
  try {
    const netInfo = await NetInfo.fetch();
    if (netInfo.type !== 'wifi' && netInfo.type !== 'ethernet') {
      return false;
    }
    if (netInfo.type === 'wifi' && Platform.OS === 'ios') {
      const details = netInfo.details;
      if (details && 'ipAddress' in details && details.ipAddress) {
        const deviceIP = details.ipAddress;
        const deviceSubnet = deviceIP.split('.').slice(0, 3).join('.');
        const targetSubnet = ip.split('.').slice(0, 3).join('.');
        if (deviceSubnet === targetSubnet) {
          return true;
        }
      }
    }
    const parts = ip.split('.');
    if (parts.length === 4) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      if (first === 10) return true;
      if (first === 172 && second >= 16 && second <= 31) return true;
      if (first === 192 && second === 168) return true;
    }
    if (ip.endsWith('.local')) return true;
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Constructs a server URL with the appropriate protocol based on whether the host is local or remote.
 * Local connections use 'http', while remote connections use 'https'.
 * 
 * @param {string} host - The hostname or IP address of the server
 * @param {string | number} port - The port number
 * @param {string} path - The path component of the URL
 * @returns {Promise<string>} The complete server URL
 */
export async function buildServerUrl(host: string, port: string | number, path: string): Promise<string> {
  const isLocal = await isLocalOrLanIP(host);
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${host}:${port}${path}`;
} 