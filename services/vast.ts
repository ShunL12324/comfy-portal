import { fetch } from 'expo/fetch';

/**
 * vast.ai REST client.
 *
 * Only the calls the app needs: check the key, search offers, create, poll,
 * list and destroy. Everything here spends or stops spending the user's money,
 * so each call is explicit rather than wrapped in convenience helpers.
 */

const API = 'https://console.vast.ai/api/v0';

export interface VastOffer {
  id: number;
  gpuName: string;
  numGpus: number;
  gpuRamGb: number;
  pricePerHour: number;
  /** Mbit/s down — the number that decides how long provisioning takes. */
  inetDown: number;
  inetUp: number;
  diskSpaceGb: number;
  /** 0..1 */
  reliability: number;
  geolocation: string;
  cudaMaxGood: number;
}

export type VastInstanceStatus = 'loading' | 'running' | 'stopped' | 'exited' | 'offline' | 'unknown';

export interface VastInstance {
  id: number;
  label: string | null;
  status: VastInstanceStatus;
  /** Free-form progress text from vast; it tails the container log. */
  statusMessage: string;
  gpuName: string;
  pricePerHour: number;
  publicIp: string | null;
  /** container port -> external port, e.g. { '8188': 41234 } */
  ports: Record<string, number>;
  /** Unix seconds. */
  startedAt: number | null;
}

export class VastError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'VastError';
  }
}

/**
 * vast tails the container log into `status_msg`, and that text can carry raw
 * control characters. JSON.parse rejects those inside strings, so a perfectly
 * good response throws — the Python client hits the same thing and works
 * around it with `strict=False`. Strip them before parsing.
 */
function parseVastJson(text: string): any {
  // Safe to strip wholesale: inside a JSON string a raw control character is
  // illegal anyway (it must be escaped), and between tokens they are only
  // optional whitespace.
  return JSON.parse(text.replace(/[\u0000-\u001F]/g, ''));
}

async function request(apiKey: string, path: string, init?: { method?: string; body?: unknown }) {
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  } as any);

  const text = await response.text();
  if (!response.ok) {
    throw new VastError(
      response.status === 401
        ? 'vast.ai rejected the API key'
        : `vast.ai request failed (${response.status}): ${text.slice(0, 200)}`,
      response.status,
    );
  }
  return parseVastJson(text);
}

/** Cheapest possible check that a key works. Costs nothing. */
export async function verifyApiKey(apiKey: string): Promise<{ email?: string; balance?: number }> {
  const data = await request(apiKey, '/users/current/');
  return { email: data?.email, balance: data?.credit };
}

const EU_COUNTRY_HINTS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'CH', 'NO',
];

export interface SearchOptions {
  gpuName: string;
  minDiskGb?: number;
  minCuda?: number;
  /** Default 'speed'. Every launch re-downloads every model, so bandwidth
   *  usually matters more than the hourly rate. */
  sortBy?: 'speed' | 'price';
  /** Many Civitai models are geo-gated for EU IPs even with a valid key. */
  allowEu?: boolean;
  limit?: number;
}

export async function searchOffers(apiKey: string, options: SearchOptions): Promise<VastOffer[]> {
  const body: Record<string, unknown> = {
    gpu_name: { in: [options.gpuName] },
    rentable: { eq: true },
    type: 'on-demand',
  };
  if (options.minDiskGb) body.disk_space = { gte: options.minDiskGb };

  const data = await request(apiKey, '/bundles/', { method: 'POST', body });
  let offers: any[] = data?.offers ?? [];

  if (options.minCuda) {
    offers = offers.filter((o) => (o.cuda_max_good ?? 0) >= options.minCuda!);
  }
  if (!options.allowEu) {
    offers = offers.filter((o) => {
      const geo = ` ${o.geolocation ?? ''}`;
      return !EU_COUNTRY_HINTS.some((c) => geo.includes(` ${c}`));
    });
  }

  const sortBy = options.sortBy ?? 'speed';
  offers.sort((a, b) =>
    sortBy === 'speed'
      ? (b.inet_down ?? 0) - (a.inet_down ?? 0)
      : (a.dph_total ?? Infinity) - (b.dph_total ?? Infinity),
  );

  return offers.slice(0, options.limit ?? 8).map(toOffer);
}

function toOffer(o: any): VastOffer {
  return {
    id: o.id,
    gpuName: o.gpu_name ?? '',
    numGpus: o.num_gpus ?? 1,
    gpuRamGb: Math.round((o.gpu_ram ?? 0) / 1024),
    pricePerHour: o.dph_total ?? 0,
    inetDown: o.inet_down ?? 0,
    inetUp: o.inet_up ?? 0,
    diskSpaceGb: o.disk_space ?? 0,
    reliability: o.reliability2 ?? 0,
    geolocation: o.geolocation ?? '',
    cudaMaxGood: o.cuda_max_good ?? 0,
  };
}

function toInstance(i: any): VastInstance {
  const ports: Record<string, number> = {};
  for (const [containerPort, mappings] of Object.entries<any>(i.ports ?? {})) {
    const host = Array.isArray(mappings) ? mappings[0]?.HostPort : undefined;
    if (host) ports[containerPort.replace('/tcp', '')] = Number(host);
  }
  return {
    id: i.id,
    label: i.label ?? null,
    status: (i.actual_status ?? 'unknown') as VastInstanceStatus,
    statusMessage: (i.status_msg ?? '').trim(),
    gpuName: i.gpu_name ?? '',
    pricePerHour: i.dph_total ?? 0,
    publicIp: i.public_ipaddr ?? null,
    ports,
    startedAt: i.start_date ? Math.floor(i.start_date) : null,
  };
}

export async function listInstances(apiKey: string): Promise<VastInstance[]> {
  const data = await request(apiKey, '/instances/');
  return (data?.instances ?? []).map(toInstance);
}

export async function getInstance(apiKey: string, instanceId: number): Promise<VastInstance> {
  // Note the shape difference: the singular endpoint returns `instances` as an
  // object, not an array.
  const data = await request(apiKey, `/instances/${instanceId}/`);
  return toInstance(data?.instances ?? {});
}

export async function destroyInstance(apiKey: string, instanceId: number): Promise<void> {
  await request(apiKey, `/instances/${instanceId}/`, { method: 'DELETE' });
}

/** Statuses from which an instance will never become reachable. */
export function isTerminalStatus(status: VastInstanceStatus): boolean {
  return status === 'exited' || status === 'offline' || status === 'unknown';
}
