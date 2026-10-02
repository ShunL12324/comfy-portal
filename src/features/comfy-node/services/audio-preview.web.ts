/**
 * The web's `<audio>` element plays a file without a player view, which
 * expo-video's web player needs; otherwise as in `audio-preview.ts`.
 */

const durations = new Map<string, number | null>();
const pendingProbes = new Map<string, Promise<number | null>>();
const listeners = new Set<() => void>();

function remember(uri: string, duration: number | null) {
  durations.set(uri, duration);
  listeners.forEach((listener) => listener());
}

const usable = (duration: number) => (Number.isFinite(duration) && duration > 0 ? duration : null);

export function peekAudioDuration(uri: string): number | null | undefined {
  return durations.get(uri);
}

export function subscribeAudioDurations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function forgetAudioDuration(uri: string) {
  durations.delete(uri);
  listeners.forEach((listener) => listener());
}

export function probeAudioDuration(uri: string): Promise<number | null> {
  const known = durations.get(uri);
  if (known !== undefined) return Promise.resolve(known);
  const inFlight = pendingProbes.get(uri);
  if (inFlight) return inFlight;
  const probe = new Promise<number | null>((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    const finish = (duration: number | null) => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      pendingProbes.delete(uri);
      remember(uri, duration);
      resolve(duration);
    };
    audio.onloadedmetadata = () => finish(usable(audio.duration));
    audio.onerror = () => finish(null);
    audio.src = uri;
  });
  pendingProbes.set(uri, probe);
  return probe;
}

export interface AudioPlaybackEvents {
  onTime: (seconds: number) => void;
  onPlaying: (playing: boolean) => void;
  onEnd: () => void;
  onError: () => void;
}

export interface AudioPlayback {
  play: () => void;
  pause: () => void;
  release: () => void;
}

let current: HTMLAudioElement | null = null;

export function createAudioPlayback(uri: string, events: AudioPlaybackEvents): AudioPlayback {
  const audio = new Audio(uri);
  audio.ontimeupdate = () => events.onTime(audio.currentTime);
  audio.onplay = () => events.onPlaying(true);
  audio.onpause = () => events.onPlaying(false);
  audio.onloadedmetadata = () => {
    const duration = usable(audio.duration);
    if (duration) remember(uri, duration);
  };
  audio.onended = () => {
    audio.currentTime = 0;
    events.onTime(0);
    events.onEnd();
  };
  audio.onerror = () => events.onError();
  let released = false;
  return {
    play: () => {
      if (released) return;
      if (current && current !== audio) current.pause();
      current = audio;
      void audio.play().catch(() => events.onError());
    },
    pause: () => audio.pause(),
    release: () => {
      if (released) return;
      released = true;
      if (current === audio) current = null;
      audio.pause();
      audio.ontimeupdate = audio.onplay = audio.onpause = audio.onloadedmetadata = audio.onended = audio.onerror = null;
      audio.removeAttribute('src');
    },
  };
}
