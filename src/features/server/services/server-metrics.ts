import type { Server } from '../types';
import { buildServerUrl, fetchWithAuth } from '@/services/network';
import { withRequestTimeout } from '@/utils/request-timeout';

export interface ServerMetrics {
  gpuName?: string;
  gpuNames?: string[];
  memoryTotal?: number;
  memoryUsed?: number;
  latencyMs: number;
  observedAt: number;
}

export interface ServerStorage {
  total: number;
  used: number;
  free: number;
  /** The measured directory, for display and support. Optional by contract. */
  path?: string;
}

/**
 * One metric's display state.
 *
 * "Still asking" and "we asked and there is nothing" are different facts and
 * must not render as the same string — showing `Unavailable` while a request is
 * in flight tells the user their server is broken when it is merely slow.
 */
export type MetricSlot<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'unavailable' };

/**
 * The model name out of ComfyUI's device string.
 *
 * It reports things like `cuda:0 NVIDIA GeForce RTX 4060 : cudaMallocAsync` —
 * a device index, a vendor prefix and the allocator it chose, none of which the
 * user is asking about when they glance at the card.
 */
export function shortGpuName(name: string | undefined): string | undefined {
  return name
    ?.replace(/^cuda:\d+\s*/i, '')
    .replace(/^NVIDIA\s+(?:GeForce\s+)?/i, '')
    .replace(/\s*:\s*\S+$/, '')
    .trim();
}

/** Only a complete, nonempty device list replaces the cached hardware snapshot. */
export function systemDeviceNames(body: unknown): string[] | undefined {
  if (!body || typeof body !== 'object' || !('devices' in body)) return undefined;
  const devices = body.devices;
  if (!Array.isArray(devices) || !devices.length) return undefined;
  const names: string[] = [];
  for (const device of devices) {
    if (!device || typeof device.name !== 'string' || !device.name.trim()) return undefined;
    names.push(device.name.trim());
  }
  return names;
}

/** ComfyUI reports device memory in bytes. Its core endpoint does not report disk size. */
export async function fetchServerMetrics(server: Server, signal?: AbortSignal): Promise<ServerMetrics> {
  return withRequestTimeout(
    async (requestSignal) => {
      const url = await buildServerUrl(server.useSSL, server.host, server.port, '/system_stats');
      const started = Date.now();
      const response = await fetchWithAuth(url, server.token, { signal: requestSignal });
      if (!response.ok) throw new Error('Server metrics are unavailable.');
      const body = await response.json();
      return serverMetricsFromBody(body, Date.now() - started);
    },
    10_000,
    signal,
  );
}

export function serverMetricsFromBody(body: any, latencyMs: number): ServerMetrics {
  const device = body?.devices?.[0];
  const gpuNames = systemDeviceNames(body);
  const total = Number.isFinite(device?.vram_total) ? device.vram_total : undefined;
  const free = Number.isFinite(device?.vram_free) ? device.vram_free : undefined;
  return {
    gpuName: typeof device?.name === 'string' ? device.name : undefined,
    gpuNames,
    memoryTotal: total,
    memoryUsed: total !== undefined && free !== undefined ? Math.max(0, total - free) : undefined,
    latencyMs,
    observedAt: Date.now(),
  };
}

/**
 * Disk capacity of the volume ComfyUI lives on, via our own Comfy Portal
 * Endpoint extension at `/cpe/system/storage`.
 *
 * ComfyUI core cannot answer this: `/system_stats` covers GPU and RAM only, and
 * `/models` lists names without sizes. A server without the extension — or with
 * a build predating this route — is the ordinary case, not a fault, so every
 * failure path here resolves to `undefined` and the screen shows "unavailable".
 * Nothing about this call is allowed to surface an error or block another
 * metric.
 *
 * Not gated on `server.CPEEnable`: that flag is stripped by the store's
 * `partialize` and reset to `undefined` on rehydrate, so it is usually unset
 * when this screen opens and gating on it would hide storage from servers that
 * do have the extension. A 404 is cheap enough to just ask.
 */
export async function fetchServerStorage(server: Server, signal?: AbortSignal): Promise<ServerStorage | undefined> {
  return withRequestTimeout(
    async (requestSignal) => {
      try {
        const url = await buildServerUrl(server.useSSL, server.host, server.port, '/cpe/system/storage');
        const response = await fetchWithAuth(url, server.token, { signal: requestSignal });
        if (!response.ok) return undefined;
        const body = await response.json();
        if (body?.status !== 'success') return undefined;

        const total = Number(body.storage?.total);
        const used = Number(body.storage?.used);
        const free = Number(body.storage?.free);
        if (!Number.isFinite(total) || total <= 0) return undefined;
        return {
          total,
          // Taken as reported rather than derived from each other: on POSIX the
          // root-reserved blocks mean used + free is a few percent short of total,
          // so computing either one from the other quietly misreports it.
          used: Number.isFinite(used) ? used : Math.max(0, total - (Number.isFinite(free) ? free : 0)),
          free: Number.isFinite(free) ? free : Math.max(0, total - (Number.isFinite(used) ? used : 0)),
          ...(typeof body.storage?.path === 'string' ? { path: body.storage.path } : {}),
        };
      } catch {
        // Unreachable, timed out, not JSON, route absent — all the same to the user.
        return undefined;
      }
    },
    5_000,
    signal,
  );
}
