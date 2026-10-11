/**
 * Reads vast's `status_msg` during a launch's opening minutes.
 *
 * Until the container runs, vast's status is the only thing that speaks, and
 * what it carries was measured on real hosts (comfy-portal-cloud-server's
 * test/vast-timeline.sh; samples in tests/features/cloud/fixtures):
 *
 * - while pulling, the last one or two lines of `docker pull`, refreshed about
 *   every 10 s: `<layer>: Download complete`, `<layer>: Pull complete`, never a
 *   byte count. The layer is the first 12 hex digits of its blob digest, so the
 *   image's manifest says how big it is;
 * - then vast's own build of an `/ssh` image on top (`#6 2.5 Get:15 …`);
 * - then `success, running <image>/ssh`, which it keeps for the instance's life.
 *
 * So pull progress is a lower bound built from the layers seen, never an
 * estimate: a layer counts once a line says it is downloaded, and because
 * docker unpacks layers strictly in order, `Pull complete` on one also settles
 * every layer before it.
 *
 * The supervisor's own `CP …` progress lines are parsed too, in case a status
 * ever carries them; on the hosts measured it did not.
 */

export interface ImageLayer {
  /** `sha256:<hex>` as in the manifest. */
  digest: string;
  /** Compressed bytes: what the pull downloads. */
  size: number;
}

/** What one layer is known to have reached. */
export type LayerState = 'downloaded' | 'extracted';

export interface SupervisorLine {
  phase: string;
  stepsDone: number;
  stepsTotal: number;
  /** The running step's kind, e.g. `extension`. */
  step?: string;
  modelsDone?: number;
  modelsTotal?: number;
  bytesDone?: number;
  bytesTotal?: number;
  /** Bytes per second. */
  rate?: number;
  error?: string;
  /** Seconds since the supervisor started. */
  t: number;
}

export interface StatusReading {
  /** Short layer id -> what this message says it reached. */
  layers: Record<string, LayerState>;
  /** `Pulling from …`, or any layer line. */
  pulling: boolean;
  /** The pull is over: digest/status lines, vast's build, or the container running. */
  pulled: boolean;
  /** vast is building its `/ssh` image on top of ours. */
  building: boolean;
  running: boolean;
  /** `Error response from daemon: …`, which on a broken host never clears. */
  daemonError?: string;
  supervisor?: SupervisorLine;
}

const LAYER_LINE = /^([0-9a-f]{12}): (.*)$/;

export function parseSupervisorLine(line: string): SupervisorLine | undefined {
  if (!line.startsWith('CP ')) return undefined;
  const fields = new Map<string, string>();
  for (const part of line.slice(3).trim().split(/\s+/)) {
    const eq = part.indexOf('=');
    if (eq > 0) fields.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const phase = fields.get('phase');
  const t = Number(fields.get('t'));
  if (!phase || !Number.isFinite(t)) return undefined;
  const pair = (key: string) => {
    const match = /^(\d+)\/(\d+)$/.exec(fields.get(key) ?? '');
    return match ? [Number(match[1]), Number(match[2])] : undefined;
  };
  const steps = pair('steps') ?? [0, 0];
  const models = pair('models');
  const bytes = pair('bytes');
  const rate = Number(fields.get('rate'));
  return {
    phase,
    stepsDone: steps[0],
    stepsTotal: steps[1],
    step: fields.get('step'),
    modelsDone: models?.[0],
    modelsTotal: models?.[1],
    bytesDone: bytes?.[0],
    bytesTotal: bytes?.[1],
    rate: Number.isFinite(rate) && fields.has('rate') ? rate : undefined,
    error: fields.get('error'),
    t,
  };
}

/** What one `status_msg` says, on its own. */
export function readStatusMessage(message: string): StatusReading {
  const reading: StatusReading = { layers: {}, pulling: false, pulled: false, building: false, running: false };
  for (const raw of message.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const layer = LAYER_LINE.exec(line);
    if (layer) {
      reading.pulling = true;
      const [, id, text] = layer;
      const state: LayerState | undefined = /^(Pull complete|Already exists)/.test(text)
        ? 'extracted'
        : /^(Download complete|Verifying Checksum|Extracting)/.test(text)
          ? 'downloaded'
          : undefined;
      if (state && reading.layers[id] !== 'extracted') reading.layers[id] = state;
      continue;
    }
    if (/: Pulling from /.test(line)) reading.pulling = true;
    else if (/^(Digest: sha256:|Status: (Downloaded newer image|Image is up to date))/.test(line))
      reading.pulled = true;
    else if (/^#\d+ /.test(line) || /^Successfully (loaded|built|tagged)/.test(line)) {
      reading.pulled = true;
      reading.building = /^#\d+ /.test(line);
    } else if (/^success, running /.test(line)) {
      reading.pulled = true;
      reading.running = true;
    } else if (/Error response from daemon/i.test(line)) reading.daemonError = line.slice(0, 200);
    const supervisor = parseSupervisorLine(line);
    if (supervisor) reading.supervisor = supervisor;
  }
  return reading;
}

/** Everything the statuses seen so far say about the pull. */
export interface PullState {
  layers: Record<string, LayerState>;
  started: boolean;
  finished: boolean;
}

export function accumulatePull(previous: PullState | undefined, reading: StatusReading): PullState {
  const layers = { ...previous?.layers };
  let changed = !previous;
  for (const [id, state] of Object.entries(reading.layers)) {
    if (layers[id] === state || layers[id] === 'extracted') continue;
    layers[id] = state;
    changed = true;
  }
  const started = !!previous?.started || reading.pulling || reading.pulled;
  const finished = !!previous?.finished || reading.pulled;
  if (!changed && started === previous?.started && finished === previous?.finished) return previous!;
  return { layers, started, finished };
}

export interface PullProgress {
  /** Layers known to be downloaded. */
  layersDone: number;
  /** Layers known to be unpacked as well. */
  layersUnpacked: number;
  /** Only from the image's manifest. */
  layersTotal?: number;
  bytesDone?: number;
  bytesTotal?: number;
  /** bytesDone / bytesTotal; absent without a manifest, never estimated. */
  ratio?: number;
}

const shortId = (digest: string) => digest.replace(/^sha256:/, '').slice(0, 12);

export function pullProgress(pull: PullState | undefined, manifest?: ImageLayer[] | null): PullProgress {
  const layers = pull?.layers ?? {};
  if (!manifest?.length) {
    const states = Object.values(layers);
    return {
      layersDone: states.length,
      layersUnpacked: states.filter((state) => state === 'extracted').length,
    };
  }
  const ids = manifest.map((layer) => shortId(layer.digest));
  // Unpacking is in manifest order, so the last unpacked layer settles all before it.
  const unpackedThrough = pull?.finished
    ? ids.length - 1
    : ids.reduce((last, id, index) => (layers[id] === 'extracted' ? index : last), -1);
  let layersDone = 0;
  let layersUnpacked = 0;
  let bytesDone = 0;
  let bytesTotal = 0;
  ids.forEach((id, index) => {
    bytesTotal += manifest[index].size;
    const unpacked = index <= unpackedThrough;
    if (unpacked || layers[id]) {
      layersDone += 1;
      bytesDone += manifest[index].size;
    }
    if (unpacked) layersUnpacked += 1;
  });
  return {
    layersDone,
    layersUnpacked,
    layersTotal: ids.length,
    bytesDone,
    bytesTotal,
    ratio: bytesTotal > 0 ? bytesDone / bytesTotal : undefined,
  };
}

// The same unit as formatBytes (services/model-url), which the model rows use.
const GB = 1024 ** 3;

/** `12 of 26 layers · 2.1 / 6.0 GB`, or as much of it as is known. */
export function describePull(progress: PullProgress): string {
  const { layersDone, layersUnpacked, layersTotal, bytesDone, bytesTotal } = progress;
  const parts = [
    layersTotal
      ? `${layersDone} of ${layersTotal} layers`
      : `${layersDone} ${layersDone === 1 ? 'layer' : 'layers'} done`,
  ];
  if (bytesDone !== undefined && bytesTotal)
    parts.push(`${(bytesDone / GB).toFixed(1)} / ${(bytesTotal / GB).toFixed(1)} GB`);
  if (layersUnpacked < layersDone) parts.push(`${layersUnpacked} unpacked`);
  return parts.join(' · ');
}

/** `downloading · 6/9 steps · 2.1 / 7.5 GB`, from a supervisor line. */
export function describeSupervisorLine(line: SupervisorLine): string {
  const parts = [
    line.error ? `${line.phase} (${line.error})` : line.phase,
    `${line.stepsDone}/${line.stepsTotal} steps`,
  ];
  if (line.step) parts.push(line.step);
  if (line.bytesDone !== undefined && line.bytesTotal)
    parts.push(`${(line.bytesDone / GB).toFixed(1)} / ${(line.bytesTotal / GB).toFixed(1)} GB`);
  return parts.join(' · ');
}
