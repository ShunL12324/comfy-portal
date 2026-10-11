import { readFileSync } from 'fs';
import { join } from 'path';
import {
  accumulatePull,
  describePull,
  describeSupervisorLine,
  parseSupervisorLine,
  pullProgress,
  readStatusMessage,
  type PullState,
} from '@/features/cloud/utils/pull-progress';
import manifest from '../fixtures/ghcr-manifest-sha-44dfa01.json';
import typical from '../fixtures/vast-timeline-typical.json';
import fast from '../fixtures/vast-timeline-fast.json';

const layers = manifest.layers;

/** Replays a recorded launch the way the poller sees it, one status at a time. */
function replay(samples: { statusMsg: string }[]) {
  let pull: PullState | undefined;
  return samples.map((sample) => {
    pull = accumulatePull(pull, readStatusMessage(sample.statusMsg.trim()));
    return { pull, progress: pullProgress(pull, layers) };
  });
}

describe('readStatusMessage on real vast statuses', () => {
  test('the pull starting', () => {
    const reading = readStatusMessage('sha-44dfa01: Pulling from shunl12324/comfy-portal-cloud-server');
    expect(reading).toMatchObject({ pulling: true, pulled: false, layers: {} });
  });

  test('layer lines, two per status', () => {
    expect(readStatusMessage('ce2970b16a29: Verifying Checksum\nce2970b16a29: Download complete').layers).toEqual({
      ce2970b16a29: 'downloaded',
    });
    expect(readStatusMessage('81556f260922: Pull complete').layers).toEqual({ '81556f260922': 'extracted' });
  });

  test('a line cut off mid-word says nothing about its layer', () => {
    expect(readStatusMessage('96527c57ab41: Verifying Checksum\n96527c57ab41: ').layers).toEqual({
      '96527c57ab41': 'downloaded',
    });
    expect(readStatusMessage('96527c57ab41: ').layers).toEqual({});
  });

  test("vast's own /ssh build means the pull is over", () => {
    for (const message of [
      '#6 2.980 Fetched 52.1 MB in 3s (18.7 MB/s)\n#6 2.980 Reading package lists...',
      '#0 building with "default" instance using docker driver\n\n#1 [internal] load build definition',
    ]) {
      expect(readStatusMessage(message)).toMatchObject({ pulled: true, building: true, running: false });
    }
    expect(
      readStatusMessage('Successfully loaded ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01'),
    ).toMatchObject({ pulled: true, building: false });
  });

  test('the container running', () => {
    expect(
      readStatusMessage('success, running ghcr.io/shunl12324/comfy-portal-cloud-server_sha-44dfa01/ssh'),
    ).toMatchObject({ pulled: true, running: true });
  });

  test('a docker daemon error', () => {
    const reading = readStatusMessage(
      'Error response from daemon: failed to create task for container: could not select device driver',
    );
    expect(reading.daemonError).toMatch(/^Error response from daemon/);
    expect(reading.pulled).toBe(false);
  });

  test('every recorded status reads without throwing, and none invents a layer', () => {
    const ids = new Set(layers.map((layer) => layer.digest.slice(7, 19)));
    for (const sample of [...typical.samples, ...fast.samples]) {
      for (const id of Object.keys(readStatusMessage(sample.statusMsg).layers)) expect(ids.has(id)).toBe(true);
    }
  });
});

describe('pull progress over a recorded launch', () => {
  test.each([
    ['typical host (Poland, 0.9 Gbps)', typical.samples],
    ['fast host (Utah, 5.5 Gbps)', fast.samples],
  ])('%s: progress only ever grows, and reaches the whole image', (_name, samples) => {
    const steps = replay(samples);
    const bytes = steps.map((step) => step.progress.bytesDone ?? 0);
    bytes.forEach((value, index) => expect(value).toBeGreaterThanOrEqual(bytes[index - 1] ?? 0));
    const last = steps[steps.length - 1];
    expect(last.pull.finished).toBe(true);
    expect(last.progress).toMatchObject({ layersDone: 26, layersTotal: 26, ratio: 1 });
    // Something real moved before the pull finished: not a jump from 0 to 100.
    const midway = steps.filter((step) => !step.pull.finished && (step.progress.ratio ?? 0) > 0);
    expect(midway.length).toBeGreaterThan(3);
  });

  test('a Pull complete settles every layer before it, downloaded or not seen', () => {
    // From the typical run: the first status after the pull began.
    const pull = accumulatePull(undefined, readStatusMessage('ce2970b16a29: Pull complete'));
    const progress = pullProgress(pull, layers);
    // ce2970b16a29 is the sixth layer: it and the five before it are unpacked.
    expect(progress).toMatchObject({ layersDone: 6, layersUnpacked: 6, layersTotal: 26 });
    expect(progress.bytesDone).toBe(layers.slice(0, 6).reduce((sum, layer) => sum + layer.size, 0));
    expect(describePull(progress)).toBe('6 of 26 layers · 0.4 / 5.6 GB');
  });

  test('downloaded but not yet unpacked layers are counted, and said to be', () => {
    let pull = accumulatePull(undefined, readStatusMessage('ce2970b16a29: Pull complete'));
    pull = accumulatePull(pull, readStatusMessage('c0e84dcfb319: Verifying Checksum\nc0e84dcfb319: Download complete'));
    expect(describePull(pullProgress(pull, layers))).toBe('7 of 26 layers · 1.0 / 5.6 GB · 6 unpacked');
  });

  test('a later status never downgrades a layer', () => {
    let pull = accumulatePull(undefined, readStatusMessage('81556f260922: Pull complete'));
    pull = accumulatePull(pull, readStatusMessage('81556f260922: Download complete'));
    expect(pull.layers['81556f260922']).toBe('extracted');
  });

  test('an unchanged status keeps the same object, so the store is not rewritten', () => {
    const pull = accumulatePull(undefined, readStatusMessage('8b79ec3555de: Download complete'));
    expect(accumulatePull(pull, readStatusMessage('8b79ec3555de: Download complete'))).toBe(pull);
  });

  test('without the manifest only what was seen is shown: no total, no percentage', () => {
    const steps = replay(typical.samples.slice(0, 6)).map((step) => pullProgress(step.pull));
    const progress = steps[steps.length - 1];
    expect(progress.layersTotal).toBeUndefined();
    expect(progress.ratio).toBeUndefined();
    expect(progress.bytesDone).toBeUndefined();
    expect(describePull(progress)).toBe('3 layers done · 1 unpacked');
  });

  test('a host that already had the image goes straight to done', () => {
    const pull = accumulatePull(
      undefined,
      readStatusMessage('success, running ghcr.io/shunl12324/comfy-portal-cloud-server_sha-44dfa01/ssh'),
    );
    expect(pullProgress(pull, layers)).toMatchObject({ layersDone: 26, ratio: 1 });
  });
});

describe('supervisor progress lines', () => {
  // The format cpd prints (internal/progress in comfy-portal-cloud-server).
  const line =
    'CP phase=downloading steps=6/7 step=extension models=1/2 bytes=2147483648/7516192768 rate=220200960 t=12';

  test('parse', () => {
    expect(parseSupervisorLine(line)).toEqual({
      phase: 'downloading',
      stepsDone: 6,
      stepsTotal: 7,
      step: 'extension',
      modelsDone: 1,
      modelsTotal: 2,
      bytesDone: 2147483648,
      bytesTotal: 7516192768,
      rate: 220200960,
      error: undefined,
      t: 12,
    });
    expect(parseSupervisorLine('CP phase=preparing steps=0/0 t=0')).toMatchObject({ phase: 'preparing', t: 0 });
    expect(parseSupervisorLine('CP phase=failed steps=1/2 error=disk_full t=3')).toMatchObject({ error: 'disk_full' });
  });

  test('anything else is not a supervisor line', () => {
    expect(parseSupervisorLine('CP probe 4')).toBeUndefined();
    expect(parseSupervisorLine('phase=ready t=1')).toBeUndefined();
  });

  test('the last one in a status wins, and describes itself', () => {
    const reading = readStatusMessage(`CP phase=preparing steps=0/0 t=0\n${line}`);
    expect(reading.supervisor?.phase).toBe('downloading');
    expect(describeSupervisorLine(reading.supervisor!)).toBe('downloading · 6/7 steps · extension · 2.0 / 7.0 GB');
  });

  test("every line cpd printed into a real container's log parses", () => {
    // From vast's container log (request_logs) during a launch of sha-bbbf00f.
    const lines = readFileSync(join(__dirname, '../fixtures/cpd-progress-lines.txt'), 'utf8')
      .trim()
      .split('\n')
      .map(parseSupervisorLine);
    expect(lines.length).toBeGreaterThan(5);
    for (const parsed of lines) {
      expect(parsed).toMatchObject({ phase: 'downloading', stepsDone: 8, modelsTotal: 2, bytesTotal: 7166530678 });
    }
    const bytes = lines.map((parsed) => parsed!.bytesDone!);
    expect([...bytes].sort((a, b) => a - b)).toEqual(bytes);
  });
});
