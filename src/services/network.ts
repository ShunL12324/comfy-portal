import { Server } from '@/features/server/types';
import { fetch } from 'expo/fetch';
import { resolveScheme } from './server-scheme';

/**
 * Helper function to make authenticated fetch requests.
 * Adds Authorization header if a token is provided.
 */
export async function fetchWithAuth(url: string, token: string | undefined, options?: RequestInit): Promise<Response> {
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
 * Builds a server URL. `Always`/`Never` fix the scheme; `Auto` uses the scheme
 * this address was found to speak (see `services/server-scheme`).
 */
export async function buildServerUrl(
  useSSL: Server['useSSL'],
  host: string,
  port: string | number,
  path: string,
): Promise<string> {
  const scheme = await resolveScheme(useSSL, host, port);
  return `${scheme}://${host}:${port}${path}`;
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
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9-]{2,})+$/;
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
 * @returns {{ host: string; port: string } | null} Parsed components or null if invalid
 */
export function parseServerUrl(url: string): { host: string; port: string } | null {
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

    // Validate extracted values
    const hostValidation = validateHost(host);
    if (!host || hostValidation !== '') {
      return null;
    }

    const portValidation = validatePort(port);
    if (portValidation !== '') {
      return null;
    }

    return { host, port };
  } catch (error) {
    return null;
  }
}
