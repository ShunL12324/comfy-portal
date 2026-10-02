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
export type RawInputSpec = [unknown, Record<string, any> | undefined];

export interface RawNodeSchema {
  input?: {
    required?: Record<string, RawInputSpec>;
    optional?: Record<string, RawInputSpec>;
  };
  display_name?: string;
  description?: string;
}

/** Presentation hints every widget can carry. */
interface WidgetMeta {
  hidden?: boolean;
  tooltip?: string;
  /** The node's own label for the input, when it differs from the key. */
  label?: string;
  /** The desktop UI tucks these behind its "advanced" toggle. */
  advanced?: boolean;
}

/** A widget we know how to render, normalised across both combo spellings. */
export type WidgetSpec =
  | (WidgetMeta & {
      kind: 'combo';
      options: string[];
      default?: unknown;
      /**
       * Dynamic combos (`COMFY_DYNAMICCOMBO_V3`) swap in extra inputs per
       * option. The workflow stores them as `<combo>.<child>` keys, e.g.
       * `mode.crop_scale`; see `resolveInputSpec`.
       */
      children?: Record<string, Record<string, WidgetSpec>>;
    })
  | (WidgetMeta & {
      kind: 'int' | 'float';
      min?: number;
      max?: number;
      step?: number;
      default?: number;
    })
  | (WidgetMeta & { kind: 'boolean'; default?: boolean })
  | (WidgetMeta & { kind: 'string'; multiline: boolean; default?: string })
  /** A typed socket (IMAGE, MODEL, ...) — wired, never a widget. */
  | { kind: 'link' };

export interface NodeSchema {
  inputs: Record<string, WidgetSpec>;
  description?: string;
}

const SCALAR_TYPES = new Set(['INT', 'FLOAT', 'BOOLEAN', 'STRING']);

export function normalizeInputSpec(spec: RawInputSpec): WidgetSpec {
  const [type, rawOptions] = Array.isArray(spec) ? spec : [undefined, undefined];
  const options = rawOptions ?? {};
  const meta: WidgetMeta = {
    hidden: options.hidden === true,
    tooltip: typeof options.tooltip === 'string' ? options.tooltip : undefined,
    label: typeof options.display_name === 'string' ? options.display_name : undefined,
    advanced: options.advanced === true ? true : undefined,
  };

  // Legacy combo: the option list *is* the type slot.
  if (Array.isArray(type)) {
    return { kind: 'combo', options: type.map(String), default: options.default, ...meta };
  }

  if (typeof type !== 'string') return { kind: 'link' };

  if (type === 'COMBO') {
    const list = Array.isArray(options.options) ? options.options.map(String) : [];
    return { kind: 'combo', options: list, default: options.default, ...meta };
  }

  if (type === 'COMFY_DYNAMICCOMBO_V3') {
    const entries: { key?: unknown; inputs?: RawNodeSchema['input'] }[] = Array.isArray(options.options)
      ? options.options
      : [];
    const children: Record<string, Record<string, WidgetSpec>> = {};
    for (const entry of entries) {
      if (typeof entry?.key !== 'string') continue;
      children[entry.key] = normalizeInputs(entry.inputs);
    }
    const keys = Object.keys(children);
    return { kind: 'combo', options: keys, default: options.default ?? keys[0], children, ...meta };
  }

  if (!SCALAR_TYPES.has(type)) return { kind: 'link' };

  if (type === 'BOOLEAN') {
    return { kind: 'boolean', default: options.default, ...meta };
  }
  if (type === 'STRING') {
    return { kind: 'string', multiline: options.multiline === true, default: options.default, ...meta };
  }
  return {
    kind: type === 'INT' ? 'int' : 'float',
    min: typeof options.min === 'number' ? options.min : undefined,
    max: typeof options.max === 'number' ? options.max : undefined,
    step: typeof options.step === 'number' ? options.step : undefined,
    default: typeof options.default === 'number' ? options.default : undefined,
    ...meta,
  };
}

function normalizeInputs(input: RawNodeSchema['input']): Record<string, WidgetSpec> {
  const inputs: Record<string, WidgetSpec> = {};
  for (const group of [input?.required, input?.optional]) {
    for (const [name, spec] of Object.entries(group ?? {})) {
      inputs[name] = normalizeInputSpec(spec);
    }
  }
  return inputs;
}

export function normalizeSchema(raw: RawNodeSchema): NodeSchema {
  return { inputs: normalizeInputs(raw.input), description: raw.description };
}

/**
 * The spec for one workflow input, including a dynamic combo's children.
 *
 * `mode.crop_scale` resolves against whichever option `mode` currently holds,
 * since the same child can carry a different range or tooltip per option.
 */
export function resolveInputSpec(
  schema: NodeSchema | null | undefined,
  key: string,
  inputs: Record<string, unknown>,
): WidgetSpec | undefined {
  if (!schema) return undefined;
  const direct = schema.inputs[key];
  if (direct) return direct;
  const dot = key.indexOf('.');
  if (dot < 0) return undefined;
  const parent = schema.inputs[key.slice(0, dot)];
  if (parent?.kind !== 'combo' || !parent.children) return undefined;
  const selected = inputs[key.slice(0, dot)];
  return typeof selected === 'string' ? parent.children[selected]?.[key.slice(dot + 1)] : undefined;
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
