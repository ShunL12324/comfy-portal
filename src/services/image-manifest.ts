import type { ImageLayer } from '@/features/cloud/utils/pull-progress';

/**
 * The layers of a published runtime image, from its registry manifest.
 *
 * vast's status names each layer as docker pulls it but never says how big it
 * is; the manifest does. With it, "8b79ec3555de: Download complete" becomes
 * real bytes out of a real total. Only GHCR is supported (anonymous pull
 * token, public images), which is where the runtime image lives; for any other
 * image the pull is shown without totals.
 */

const INDEX_TYPES = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
];
const MANIFEST_TYPES = [
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
];

/** `ghcr.io/owner/name:tag` -> repository and reference; undefined for other registries. */
export function parseGhcrImage(image: string): { repository: string; reference: string } | undefined {
  const match = /^ghcr\.io\/([a-z0-9._/-]+?)(?::([\w][\w.-]{0,127}))?(?:@(sha256:[0-9a-f]{64}))?$/.exec(image.trim());
  if (!match) return undefined;
  return { repository: match[1], reference: match[3] ?? match[2] ?? 'latest' };
}

/** The linux/amd64 manifest in an index (a vast host is amd64). */
export function pickPlatformManifest(index: any): string | undefined {
  const manifests: any[] = Array.isArray(index?.manifests) ? index.manifests : [];
  return manifests.find((entry) => entry?.platform?.os === 'linux' && entry?.platform?.architecture === 'amd64')
    ?.digest;
}

export function layersFromManifest(manifest: any): ImageLayer[] | undefined {
  if (!Array.isArray(manifest?.layers)) return undefined;
  const layers = manifest.layers
    .filter((layer: any) => typeof layer?.digest === 'string' && Number.isFinite(layer?.size))
    .map((layer: any) => ({ digest: layer.digest as string, size: Number(layer.size) }));
  return layers.length ? layers : undefined;
}

async function getJson(url: string, token: string, accept: string[]): Promise<any> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, Accept: accept.join(', ') },
  });
  if (!response.ok) throw new Error(`Registry answered ${response.status}`);
  return response.json();
}

export async function fetchImageLayers(image: string): Promise<ImageLayer[] | undefined> {
  const ref = parseGhcrImage(image);
  if (!ref) return undefined;
  const tokenResponse = await fetch(`https://ghcr.io/token?scope=repository:${ref.repository}:pull`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenResponse.ok) throw new Error(`Registry token request failed (${tokenResponse.status})`);
  const token = (await tokenResponse.json())?.token;
  if (typeof token !== 'string') throw new Error('Registry returned no token');

  const base = `https://ghcr.io/v2/${ref.repository}/manifests/`;
  let manifest = await getJson(base + ref.reference, token, [...INDEX_TYPES, ...MANIFEST_TYPES]);
  if (!Array.isArray(manifest?.layers)) {
    const digest = pickPlatformManifest(manifest);
    if (!digest) return undefined;
    manifest = await getJson(base + digest, token, MANIFEST_TYPES);
  }
  return layersFromManifest(manifest);
}
