import { Server } from '@/types/server';
import NetInfo from '@react-native-community/netinfo';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

/**
 * Helper function to make authenticated fetch requests.
 * Adds Authorization header if a token is provided.
 */
export async function fetchWithAuth(
  url: string,
  token: string | undefined,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
  } as any) as Promise<any>;
}

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
export async function buildServerUrl(useSSL: Server['useSSL'], host: string, port: string | number, path: string): Promise<string> {
  if (useSSL === 'Always') {
    return `https://${host}:${port}${path}`;
  } else if (useSSL === 'Never') {
    return `http://${host}:${port}${path}`;
  } else {
    const isLocal = await isLocalOrLanIP(host);
    const protocol = isLocal ? 'http' : 'https';
    return `${protocol}://${host}:${port}${path}`;
  }
}

const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Validates a hostname or IP address.
 * Accepts IP addresses, domain names, and 'localhost'.
 * 
 * @param {string} host - The hostname or IP address to validate
 * @returns {string} Error message if invalid, empty string if valid
 */
export function validateHost(host: string): string {
  if (host.length === 0) {
    return 'Host is required';
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  const localhostRegex = /^localhost$/;

  if (!ipRegex.test(host) && !domainRegex.test(host) && !localhostRegex.test(host)) {
    return 'Invalid host or IP address';
  }

  if (ipRegex.test(host)) {
    const parts = host.split('.');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return 'Invalid IP address';
      }
    }
  }
  return '';
}

/**
 * Validates a port number.
 * Port must be between 1 and 65535.
 * 
 * @param {string} port - The port number to validate
 * @returns {string} Error message if invalid, empty string if valid
 */
export function validatePort(port: string): string {
  if (port.length === 0) {
    return 'Port is required';
  }
  const portNum = parseInt(port, 10);
  if (isNaN(portNum)) {
    return 'Port must be a number';
  }
  if (portNum < MIN_PORT || portNum > MAX_PORT) {
    return `Port must be between ${MIN_PORT} and ${MAX_PORT}`;
  }
  return '';
}

/**
 * Parses a server URL into its components.
 * Accepts URLs in the format: http(s)://hostname:port
 * 
 * @param {string} url - The URL to parse
 * @returns {{ host: string; port: string; useSSL: Server['useSSL'] } | null} Parsed components or null if invalid
 */
export function parseServerUrl(url: string): { host: string; port: string; useSSL: Server['useSSL'] } | null {
  try {
    const urlObj = new URL(url);

    // Check if protocol is valid
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }

    // Extract host without port
    const host = urlObj.hostname;

    // Extract port
    let port = urlObj.port;
    if (!port) {
      port = urlObj.protocol === 'https:' ? '443' : '80';
    }

    // Determine SSL setting
    let useSSL: Server['useSSL'] = 'Auto';

    // Validate extracted values
    const hostValidation = validateHost(host);
    if (!host || hostValidation !== '') {
      return null;
    }

    const portValidation = validatePort(port);
    if (portValidation !== '') {
      return null;
    }

    return { host, port, useSSL };
  } catch (error) {
    return null;
  }
} 