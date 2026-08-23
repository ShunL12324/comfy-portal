import { useServersStore } from '@/features/server/stores/server-store';
import { buildServerUrl, fetchWithAuth } from './network';

/**
 * Reads node definitions from a ComfyUI server's `/object_info`.
 *
 * The app otherwise hardcodes every enum, range and default, which silently
 * goes stale as ComfyUI and its extensions release. The server already knows
 * the truth for the nodes *it* has installed — including which model files
 * exist — so for anything we don't hand-render, ask it instead of guessing.
 */

/** Raw input spec: `[type, options]`, where combos have two legal spellings. */
type RawInputSpec = [unknown, Record<string, any> | undefined];

interface RawNodeSchema {
  input?: {
    required?: Record<string, RawInputSpec>;
    optional?: Record<string, RawInputSpec>;
  };
  display_name?: string;
  description?: string;
}

/** A widget we know how to render, normalised across both combo spellings. */
export type WidgetSpec =
  | { kind: 'combo'; options: string[]; default?: unknown; hidden: boolean; tooltip?: string }
  | {
      kind: 'int' | 'float';
      min?: number;
      max?: number;
      step?: number;
      default?: number;
      hidden: boolean;
      tooltip?: string;
    }
  | { kind: 'boolean'; default?: boolean; hidden: boolean; tooltip?: string }
  | { kind: 'string'; multiline: boolean; default?: string; hidden: boolean; tooltip?: string }
  /** A typed socket (IMAGE, MODEL, ...) — wired, never a widget. */
  | { kind: 'link' };

export interface NodeSchema {
  inputs: Record<string, WidgetSpec>;
  description?: string;
}

const SCALAR_TYPES = new Set(['INT', 'FLOAT', 'BOOLEAN', 'STRING']);

function normalizeInputSpec(spec: RawInputSpec): WidgetSpec {
  const [type, rawOptions] = Array.isArray(spec) ? spec : [undefined, undefined];
  const options = rawOptions ?? {};
  const hidden = options.hidden === true;
  const tooltip = typeof options.tooltip === 'string' ? options.tooltip : undefined;

  // Legacy combo: the option list *is* the type slot.
  if (Array.isArray(type)) {
    return { kind: 'combo', options: type.map(String), default: options.default, hidden, tooltip };
  }

  if (typeof type !== 'string') return { kind: 'link' };

  if (type === 'COMBO') {
    const list = Array.isArray(options.options) ? options.options.map(String) : [];
    return { kind: 'combo', options: list, default: options.default, hidden, tooltip };
  }

  if (!SCALAR_TYPES.has(type)) return { kind: 'link' };

  if (type === 'BOOLEAN') {
    return { kind: 'boolean', default: options.default, hidden, tooltip };
  }
  if (type === 'STRING') {
    return {
      kind: 'string',
      multiline: options.multiline === true,
      default: options.default,
      hidden,
      tooltip,
    };
  }
  return {
    kind: type === 'INT' ? 'int' : 'float',
    min: typeof options.min === 'number' ? options.min : undefined,
    max: typeof options.max === 'number' ? options.max : undefined,
    step: typeof options.step === 'number' ? options.step : undefined,
    default: typeof options.default === 'number' ? options.default : undefined,
    hidden,
    tooltip,
  };
}

function normalizeSchema(raw: RawNodeSchema): NodeSchema {
  const inputs: Record<string, WidgetSpec> = {};
  for (const group of [raw.input?.required, raw.input?.optional]) {
    for (const [name, spec] of Object.entries(group ?? {})) {
      inputs[name] = normalizeInputSpec(spec);
    }
  }
  return { inputs, description: raw.description };
}

// serverId -> classType -> schema (null = server has no such node)
const cache = new Map<string, Map<string, NodeSchema | null>>();
const inFlight = new Map<string, Promise<NodeSchema | null>>();

/**
 * Fetch one node's definition, per class rather than the whole catalogue —
 * `/object_info` can be megabytes on a server with many custom nodes, while a
 * workflow only ever needs a handful of classes.
 */
export async function getNodeSchema(
  serverId: string,
  classType: string,
): Promise<NodeSchema | null> {
  const serverCache = cache.get(serverId);
  if (serverCache?.has(classType)) return serverCache.get(classType) ?? null;

  const key = `${serverId}::${classType}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = (async (): Promise<NodeSchema | null> => {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) return null;

    let path = `/object_info/${encodeURIComponent(classType)}`;
    if (server.token) path += `?token=${server.token}`;

    const url = await buildServerUrl(server.useSSL, server.host, server.port, path);
    const response = await fetchWithAuth(url, server.token);
    if (!response.ok) throw new Error(`Failed to load schema for ${classType}`);

    const data = await response.json();
    const raw = data?.[classType];
    return raw ? normalizeSchema(raw) : null;
  })();

  inFlight.set(key, request);
  try {
    const schema = await request;
    if (!cache.has(serverId)) cache.set(serverId, new Map());
    cache.get(serverId)!.set(classType, schema);
    return schema;
  } finally {
    inFlight.delete(key);
  }
}

// Bumped on every invalidation so mounted consumers can refetch. Without this a
// clear only takes effect on the next mount, and the picker's refresh button —
// pressed precisely because the option list looks wrong — would do nothing
// visible.
let cacheVersion = 0;
const versionListeners = new Set<() => void>();

export function subscribeNodeSchemaCache(listener: () => void) {
  versionListeners.add(listener);
  return () => {
    versionListeners.delete(listener);
  };
}

export function getNodeSchemaCacheVersion() {
  return cacheVersion;
}

/** Forget cached definitions, e.g. after the user restarts a server. */
export function clearNodeSchemaCache(serverId?: string) {
  if (serverId) cache.delete(serverId);
  else cache.clear();
  cacheVersion += 1;
  versionListeners.forEach((listener) => listener());
}
