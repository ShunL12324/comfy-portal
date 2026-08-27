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

export type VastInstanceStatus =
  /** vast hasn't placed the instance on a host yet — every launch starts here. */
  | 'pending'
  | 'loading'
  | 'running'
  | 'stopped'
  | 'exited'
  | 'offline'
  | 'unknown';

export interface VastInstance {
  id: number;
  label: string | null;
  status: VastInstanceStatus;
  /** Free-form progress text from vast; it tails the container log. */
  statusMessage: string;
  /**
   * What vast intends the instance to be, as opposed to what the host reports.
   * They diverge exactly when vast has given up on it — a broken host, a failed
   * image pull — and that divergence is the earliest reliable failure signal.
   */
  intendedStatus: string | null;
  curState: string | null;
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
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
  // Only when there is something to describe. A Content-Type on a bodyless GET
  // is meaningless and some intermediaries object to it.
  if (init?.body) headers['Content-Type'] = 'application/json';

  // The global fetch rather than expo/fetch: the streaming implementation is
  // there for AI SDK responses, and against vast's HTTP/2 + Cloudflare front it
  // fails on iOS with NSURLErrorNetworkConnectionLost. Nothing here streams.
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    // vast answers unauthenticated requests with 404 rather than 401 — it
    // doesn't distinguish "no such endpoint" from "not allowed to see it" — so
    // a bad key looks like a wrong URL unless we say otherwise.
    const rejected = response.status === 401 || response.status === 403 || response.status === 404;
    throw new VastError(
      rejected
        ? 'vast.ai rejected the request — check the API key'
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

const KNOWN_STATUSES: VastInstanceStatus[] = [
  'pending',
  'loading',
  'running',
  'stopped',
  'exited',
  'offline',
  'unknown',
];

/**
 * `actual_status` is whatever the host last reported, and it is absent for the
 * first stretch of every launch — the instance exists and is billing, but no
 * host has claimed it yet. Reading that absence as a status is how a perfectly
 * healthy launch gets mistaken for a dead one.
 */
function normalizeStatus(raw: unknown): VastInstanceStatus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return 'pending';
  return KNOWN_STATUSES.includes(value as VastInstanceStatus)
    ? (value as VastInstanceStatus)
    : 'unknown';
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
    status: normalizeStatus(i.actual_status),
    statusMessage: (i.status_msg ?? '').trim(),
    intendedStatus: i.intended_status ?? null,
    curState: i.cur_state ?? null,
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

/**
 * Statuses that mean the host reported the container dead. Deliberately not
 * 'unknown': that is also what a host looks like when it simply misses a
 * check-in, so it needs to persist before it counts — see provisionInstance.
 */
export function isTerminalStatus(status: VastInstanceStatus): boolean {
  return status === 'exited' || status === 'offline';
}

/**
 * Whether vast has abandoned an instance that was supposed to be starting.
 *
 * `actual_status` alone misses this. A host whose GPU devices don't resolve
 * leaves the container 'created' forever while vast quietly flips
 * intended_status to 'stopped' — seen in the wild as "failed to inject CDI
 * devices". Waiting on actual_status there costs the full provisioning timeout
 * and reports the wrong reason.
 */
export function hasVastGivenUp(instance: VastInstance): boolean {
  return instance.intendedStatus === 'stopped' || instance.curState === 'stopped';
}

export interface CreateInstanceOptions {
  offerId: number;
  diskGb: number;
  label: string;
  /** Shell run by the instance on boot. vast caps this at 4048 characters. */
  onstart: string;
  /** Plain env vars; port publishing is added separately. */
  env: Record<string, string>;
  /** Container ports to publish, e.g. [8188]. */
  ports: number[];
  image?: string;
}

const DEFAULT_IMAGE = 'nvidia/cuda:13.3.0-cudnn-devel-ubuntu22.04';

/** vast's hard cap on the onstart field. */
export const ONSTART_LIMIT = 4048;

/**
 * Rents the machine. **This starts billing**, so it is only ever called behind
 * an explicit confirmation.
 */
export async function createInstance(
  apiKey: string,
  options: CreateInstanceOptions,
): Promise<number> {
  if (options.onstart.length > ONSTART_LIMIT) {
    throw new VastError(
      `Startup script is ${options.onstart.length} characters; vast allows ${ONSTART_LIMIT}.`,
    );
  }

  // vast takes env vars and port mappings as one docker-flag-style string
  // rather than a structured field.
  const envString = [
    ...Object.entries(options.env)
      .filter(([, value]) => value)
      .map(([key, value]) => `-e ${key}=${value}`),
    ...options.ports.map((p) => `-p ${p}:${p}`),
  ].join(' ');

  const data = await request(apiKey, `/asks/${options.offerId}/`, {
    method: 'PUT',
    body: {
      image: options.image ?? DEFAULT_IMAGE,
      disk: options.diskGb,
      runtype: 'ssh_direct',
      label: options.label,
      env: envString,
      onstart: options.onstart,
    },
  });

  // Documented quirk: the new instance id comes back as `new_contract`.
  const instanceId = data?.new_contract;
  if (!instanceId) {
    throw new VastError('vast accepted the request but returned no instance id');
  }
  return Number(instanceId);
}

export interface GpuChoice {
  name: string;
  /** How many rentable offers exist right now. */
  offerCount: number;
  /** Cheapest current rate, $/hr. */
  fromPrice: number;
  /** Best VRAM seen across those offers, GB. */
  maxVramGb: number;
}

/**
 * The GPUs that can actually be rented at this moment.
 *
 * Queried rather than hardcoded: vast's names are its own short strings ("RTX
 * PRO 6000 WS", not the marketing name), the catalogue shifts as cards come and
 * go, and a typo in a hand-entered name just returns nothing with no
 * explanation. Availability and price come along for free, which is most of
 * what makes the choice.
 */
export async function listAvailableGpus(apiKey: string): Promise<GpuChoice[]> {
  const data = await request(apiKey, '/bundles/', {
    method: 'POST',
    body: { rentable: { eq: true }, type: 'on-demand', limit: 1000 },
  });

  const byName = new Map<string, GpuChoice>();
  for (const offer of data?.offers ?? []) {
    const name = offer.gpu_name;
    if (!name) continue;
    const entry = byName.get(name) ?? { name, offerCount: 0, fromPrice: Infinity, maxVramGb: 0 };
    entry.offerCount += 1;
    entry.fromPrice = Math.min(entry.fromPrice, offer.dph_total ?? Infinity);
    entry.maxVramGb = Math.max(entry.maxVramGb, Math.round((offer.gpu_ram ?? 0) / 1024));
    byName.set(name, entry);
  }

  // Most available first: a card with three offers is a card whose price and
  // location you don't get to choose.
  return [...byName.values()]
    .filter((g) => Number.isFinite(g.fromPrice))
    .sort((a, b) => b.offerCount - a.offerCount);
}
