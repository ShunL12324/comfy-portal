import { VideoPlayer, createVideoPlayer } from 'expo-video';

/**
 * Listening to a loader's audio file without keeping a player per node.
 * expo-video's player is AVPlayer / ExoPlayer, which play audio-only sources
 * too, so no audio module is needed (expo-audio is not installed). A player
 * exists only while it plays, or briefly while a duration is read; both ask
 * the server for byte ranges, so reading a duration fetches the header only.
 */

/** Durations in seconds; `null` when the file cannot be read. Absent: not asked yet. */
const durations = new Map<string, number | null>();
const pendingProbes = new Map<string, Promise<number | null>>();
const listeners = new Set<() => void>();
/** A player that never loads (server gone mid-request) is given up on after this. */
const PROBE_TIMEOUT = 15_000;

function remember(uri: string, duration: number | null) {
  durations.set(uri, duration);
  listeners.forEach((listener) => listener());
}

export function peekAudioDuration(uri: string): number | null | undefined {
  return durations.get(uri);
}

export function subscribeAudioDurations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Drops what is known about a URL whose file was replaced by an upload. */
export function forgetAudioDuration(uri: string) {
  durations.delete(uri);
  listeners.forEach((listener) => listener());
}

/** How long a file plays, read once by a player that is released as soon as it knows. */
export function probeAudioDuration(uri: string): Promise<number | null> {
  const known = durations.get(uri);
  if (known !== undefined) return Promise.resolve(known);
  const inFlight = pendingProbes.get(uri);
  if (inFlight) return inFlight;
  const probe = new Promise<number | null>((resolve) => {
    const player = createVideoPlayer(uri);
    player.muted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscriptions: { remove: () => void }[] = [];
    let done = false;
    const finish = (duration: number | null, keep: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subscriptions.forEach((subscription) => subscription.remove());
      player.release();
      pendingProbes.delete(uri);
      if (keep) remember(uri, duration);
      resolve(duration);
    };
    subscriptions.push(
      player.addListener('sourceLoad', ({ duration }) =>
        finish(Number.isFinite(duration) && duration > 0 ? duration : null, true),
      ),
      player.addListener('statusChange', ({ status }) => {
        if (status === 'error') finish(null, true);
      }),
    );
    // Not remembered: the next look tries again.
    timer = setTimeout(() => finish(null, false), PROBE_TIMEOUT);
  });
  pendingProbes.set(uri, probe);
  return probe;
}

export interface AudioPlaybackEvents {
  /** Seconds played, a few times a second. */
  onTime: (seconds: number) => void;
  onPlaying: (playing: boolean) => void;
  /** Reached the end; playback is back at the start, paused. */
  onEnd: () => void;
  onError: () => void;
}

export interface AudioPlayback {
  play: () => void;
  pause: () => void;
  release: () => void;
}

/** Only one file plays at a time: starting one stops the last. */
let current: { player: VideoPlayer; stop: () => void } | null = null;

/** A player for one file, until `release`. Starting it pauses any other. */
export function createAudioPlayback(uri: string, events: AudioPlaybackEvents): AudioPlayback {
  const player = createVideoPlayer(uri);
  player.timeUpdateEventInterval = 0.25;
  const subscriptions = [
    player.addListener('timeUpdate', ({ currentTime }) => events.onTime(currentTime)),
    player.addListener('playingChange', ({ isPlaying }) => events.onPlaying(isPlaying)),
    player.addListener('sourceLoad', ({ duration }) => {
      if (Number.isFinite(duration) && duration > 0) remember(uri, duration);
    }),
    player.addListener('playToEnd', () => {
      player.pause();
      player.currentTime = 0;
      events.onTime(0);
      events.onEnd();
    }),
    player.addListener('statusChange', ({ status }) => {
      if (status === 'error') events.onError();
    }),
  ];
  const stop = () => player.pause();
  let released = false;
  return {
    play: () => {
      if (released) return;
      if (current && current.player !== player) current.stop();
      current = { player, stop };
      player.play();
    },
    pause: stop,
    release: () => {
      if (released) return;
      released = true;
      if (current?.player === player) current = null;
      subscriptions.forEach((subscription) => subscription.remove());
      player.release();
    },
  };
}
