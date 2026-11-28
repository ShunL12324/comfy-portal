import { GALLERY_MEDIA_EXTENSIONS } from '@/features/generation/utils/media';
import type { Server } from '@/features/server/types';
import { z } from 'zod';
import { buildServerUrl, fetchWithAuth } from './network';

const outputPath = z.string().refine((path) =>
  !path.includes('\\') && !path.includes('\0') &&
  path.split('/').every((part) => part && part !== '.' && part !== '..'),
);

const assetList = z.object({
  items: z.array(z.object({ relpath: outputPath, mtime: z.number(), size: z.number() })),
  has_more: z.literal(false),
});

const deleteResult = z.object({ removed: z.array(z.string()), failed: z.array(z.string()) });

export interface GalleryMedia {
  url: string;
  timestamp: number;
  outputPath?: string;
  thumbnailUrl?: string;
}

export class AssetsPlusUnavailableError extends Error {
  constructor() {
    super('Install or update Assets+ on this ComfyUI server to browse server assets.');
  }
}

export function getOutputPath(filename: string, subfolder = ''): string | undefined {
  if (filename.includes('/')) return;
  const path = outputPath.safeParse(subfolder ? `${subfolder.replaceAll('\\', '/')}/${filename}` : filename);
  return path.success ? path.data : undefined;
}

export function getSavedOutputPath(savedPath?: string, originalUrl?: string): string | undefined {
  if (savedPath) {
    const result = outputPath.safeParse(savedPath);
    return result.success ? result.data : undefined;
  }
  // Older web entries already retain the original /view URL.
  if (!originalUrl || !/^https?:\/\/[^/]+\/(?:api\/)?view\?/.test(originalUrl)) return;
  try {
    const params = new URLSearchParams(originalUrl.slice(originalUrl.indexOf('?') + 1));
    const filename = params.get('filename');
    if (params.get('type') === 'output' && filename) {
      return getOutputPath(filename, params.get('subfolder') ?? '');
    }
  } catch {
    return undefined;
  }
}

function viewPath(path: string, token?: string, version?: string) {
  const parts = path.split('/');
  const filename = parts.pop()!;
  const params = new URLSearchParams({ filename, subfolder: parts.join('/'), type: 'output' });
  if (token) params.set('token', token);
  if (version) params.set('v', version);
  return `/view?${params}`;
}

async function request(server: Server, path: string, options?: RequestInit) {
  const url = await buildServerUrl(server.useSSL, server.host, server.port, path);
  return fetchWithAuth(url, server.token, options);
}

export async function listServerAssets(server: Server, signal?: AbortSignal, fresh = false): Promise<GalleryMedia[]> {
  const params = new URLSearchParams({
    extensions: GALLERY_MEDIA_EXTENSIONS.join(','),
    recursive: '1',
    scan_depth: '-1',
    limit: '0',
    lite: '1',
  });
  if (fresh) params.set('fresh', '1');
  const response = await request(server, `/assets_plus/output/list?${params}`, { signal, cache: 'no-store' });
  if (response.status === 404) throw new AssetsPlusUnavailableError();
  if (!response.ok) throw new Error(`Could not load server assets (HTTP ${response.status}).`);

  const { items } = assetList.parse(await response.json());
  const base = await buildServerUrl(server.useSSL, server.host, server.port, '');
  return items.map(({ relpath, mtime, size }) => {
    const version = `${mtime}-${size}`;
    const thumbnailParams = new URLSearchParams({ relpath, w: '256', h: '256', v: version });
    if (server.token) thumbnailParams.set('token', server.token);
    return {
      url: base + viewPath(relpath, server.token, version),
      thumbnailUrl: `${base}/assets_plus/output/thumb?${thumbnailParams}`,
      outputPath: relpath,
      timestamp: mtime * 1000,
    };
  });
}

// Assets+ can hide existing files. Confirm that absent entries are actually
// missing from /view before removing any local workflow history.
export async function findMissingAssets(server: Server, paths: string[], signal?: AbortSignal) {
  const missing = new Set<string>();
  const unique = [...new Set(paths)];
  for (let offset = 0; offset < unique.length; offset += 6) {
    await Promise.all(unique.slice(offset, offset + 6).map(async (path) => {
      const response = await request(server, viewPath(path, server.token), {
        method: 'HEAD',
        signal,
        cache: 'no-store',
      });
      if (response.status === 404) missing.add(path);
    }));
  }
  return missing;
}

export async function deleteServerAssets(server: Server, paths: string[]): Promise<Set<string>> {
  const relpaths = [...new Set(paths)].filter((path) => outputPath.safeParse(path).success);
  if (!relpaths.length) return new Set();

  const response = await request(server, '/assets_plus/output/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relpaths, mode: 'delete' }),
  });
  if (response.status === 404) throw new AssetsPlusUnavailableError();
  if (!response.ok) throw new Error(`Could not delete server assets (HTTP ${response.status}).`);

  const { removed, failed } = deleteResult.parse(await response.json());
  const confirmed = removed.filter((path) => relpaths.includes(path));
  if (!failed.length) return new Set(confirmed);

  // The file may have been deleted from another client while this request ran.
  // Retain confirmed successes even when the follow-up check cannot connect.
  const missing = await findMissingAssets(server, failed.filter((path) => relpaths.includes(path)))
    .catch(() => new Set<string>());
  return new Set([...confirmed, ...missing]);
}
