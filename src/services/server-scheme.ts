import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from 'expo/fetch';
import type { Server } from '@/features/server/types';

/**
 * Which scheme an `Auto` connection actually speaks, found by asking it.
 *
 * A private address usually runs plain HTTP and a public one usually has a
 * certificate, but "usually" is what broke users with a rented GPU on a bare
 * public IP. So `Auto` probes ComfyUI's `/system_stats` over one scheme and
 * then the other, keeps the first that really answers, and remembers it per
 * host and port.
 *
 * Once HTTPS has worked for an address it is pinned: a later failure makes the
 * server look offline rather than quietly retrying in plain text, which anyone
 * on the network could otherwise force in order to read the token.
 */
export type Scheme = 'http' | 'https';

interface SchemeRecord {
  scheme: Scheme;
  /** HTTPS has answered at this address at least once; never fall back to HTTP. */
  pinned: boolean;
}

const STORAGE_KEY = 'server-schemes-v1';
const PROBE_TIMEOUT_MS = 4000;
/** A server that answered neither way is not probed again on every request. */
const UNREACHABLE_RETRY_MS = 15_000;

const records = new Map<string, SchemeRecord>();
const unreachableUntil = new Map<string, number>();
const inFlight = new Map<string, Promise<Scheme | null>>();
const listeners = new Set<() => void>();
let loaded: Promise<void> | null = null;

const keyOf = (host: string, port: string | number) => `${host.trim().toLowerCase()}:${port}`;

function load() {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as Record<string, SchemeRecord>) : {};
      for (const [key, record] of Object.entries(saved)) {
        if (!records.has(key) && (record?.scheme === 'http' || record?.scheme === 'https')) {
          records.set(key, { scheme: record.scheme, pinned: !!record.pinned });
        }
      }
    })
    .catch(() => {});
  return loaded;
}

function changed() {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(records))).catch(() => {});
  listeners.forEach((listener) => listener());
}

/** Private, loopback and mDNS addresses, where plain HTTP is the normal case. */
export function isPrivateHost(host: string): boolean {
  const name = host.trim().toLowerCase();
  if (name === 'localhost' || name.endsWith('.local')) return true;
  const parts = name.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * Whether ComfyUI answered over `scheme`. A JSON body with `system` is ComfyUI;
 * 401/403 is an authenticating proxy that did speak this scheme (the probe
 * never sends the token). Anything else, notably the 400 a TLS port returns to
 * a plain request, does not count.
 */
async function answers(scheme: Scheme, host: string, port: string | number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${scheme}://${host}:${port}/system_stats`, { signal: controller.signal });
    if (response.status === 401 || response.status === 403) return true;
    if (!response.ok) return false;
    const body = await response.json();
    return !!body && typeof body === 'object' && 'system' in body;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The scheme an `Auto` connection speaks, probing once if it is not known yet.
 * Returns null when neither scheme answered.
 */
export async function probeScheme(host: string, port: string | number): Promise<Scheme | null> {
  await load();
  const key = keyOf(host, port);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const pinned = records.get(key)?.pinned ?? false;
  const order: Scheme[] = pinned ? ['https'] : isPrivateHost(host) ? ['http', 'https'] : ['https', 'http'];
  const task = (async () => {
    for (const scheme of order) {
      if (await answers(scheme, host, port)) {
        unreachableUntil.delete(key);
        records.set(key, { scheme, pinned: pinned || scheme === 'https' });
        changed();
        return scheme;
      }
    }
    unreachableUntil.set(key, Date.now() + UNREACHABLE_RETRY_MS);
    return null;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

/**
 * Seeds what a legacy `Always`/`Never` setting already told us, so migrating a
 * connection to `Auto` does not change how it connects. An existing record wins.
 */
export async function seedScheme(host: string, port: string | number, scheme: Scheme) {
  await load();
  const key = keyOf(host, port);
  if (records.has(key)) return;
  records.set(key, { scheme, pinned: scheme === 'https' });
  changed();
}

/** The scheme to use for a request right now. Never throws; probes at most once per address at a time. */
export async function resolveScheme(useSSL: Server['useSSL'], host: string, port: string | number): Promise<Scheme> {
  if (useSSL === 'Always') return 'https';
  if (useSSL === 'Never') return 'http';
  await load();
  const key = keyOf(host, port);
  const known = records.get(key);
  if (known) return known.scheme;
  const fallback: Scheme = isPrivateHost(host) ? 'http' : 'https';
  if ((unreachableUntil.get(key) ?? 0) > Date.now()) return fallback;
  return (await probeScheme(host, port)) ?? fallback;
}

/**
 * A request over the remembered scheme failed to connect. Forget an unpinned
 * choice so the next request probes again; a pinned HTTPS choice stays.
 */
export function schemeFailed(host: string, port: string | number) {
  const key = keyOf(host, port);
  const record = records.get(key);
  if (record && !record.pinned) {
    records.delete(key);
    changed();
  }
}

/** The remembered scheme for an address, if one has been found. */
export function knownScheme(host: string, port: string | number): Scheme | undefined {
  return records.get(keyOf(host, port))?.scheme;
}

export function subscribeSchemes(listener: () => void) {
  listeners.add(listener);
  void load().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: forget everything, including what was loaded from storage. */
export function resetSchemesForTest() {
  records.clear();
  unreachableUntil.clear();
  inFlight.clear();
  loaded = null;
}
