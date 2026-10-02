/** Audio for loader nodes: players that exist only while they play, or for a moment to read a length. */
import {
  createAudioPlayback,
  forgetAudioDuration,
  peekAudioDuration,
  probeAudioDuration,
} from '@/features/comfy-node/services/audio-preview';

type Handler = (payload: any) => void;
interface MockPlayer {
  uri: string;
  muted: boolean;
  released: boolean;
  playing: boolean;
  currentTime: number;
  timeUpdateEventInterval: number;
  emit: (event: string, payload?: unknown) => void;
}
const mockPlayers: MockPlayer[] = [];

jest.mock('expo-video', () => ({
  createVideoPlayer: (uri: string) => {
    const handlers = new Map<string, Set<Handler>>();
    const player = {
      uri,
      muted: false,
      released: false,
      playing: false,
      currentTime: 0,
      timeUpdateEventInterval: 0,
      addListener: (event: string, handler: Handler) => {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
        return { remove: () => handlers.get(event)!.delete(handler) };
      },
      emit: (event: string, payload?: unknown) => handlers.get(event)?.forEach((handler) => handler(payload)),
      play: () => {
        player.playing = true;
      },
      pause: () => {
        player.playing = false;
      },
      release: () => {
        player.released = true;
      },
    };
    mockPlayers.push(player);
    return player;
  },
}));

beforeEach(() => {
  mockPlayers.length = 0;
});

test('a length is read once, by a muted player released as soon as it knows', async () => {
  const uri = 'https://box/view?filename=voice.mp3';
  const first = probeAudioDuration(uri);
  const second = probeAudioDuration(uri);
  expect(mockPlayers).toHaveLength(1);
  expect(mockPlayers[0].muted).toBe(true);

  mockPlayers[0].emit('sourceLoad', { duration: 63.2 });
  expect(await first).toBe(63.2);
  expect(await second).toBe(63.2);
  expect(mockPlayers[0].released).toBe(true);
  expect(peekAudioDuration(uri)).toBe(63.2);
  expect(await probeAudioDuration(uri)).toBe(63.2);
  expect(mockPlayers).toHaveLength(1);

  forgetAudioDuration(uri);
  expect(peekAudioDuration(uri)).toBeUndefined();
});

test('an unreadable file settles on null and frees its player', async () => {
  const uri = 'https://box/view?filename=broken.wav';
  const probe = probeAudioDuration(uri);
  mockPlayers[0].emit('statusChange', { status: 'error' });
  expect(await probe).toBeNull();
  expect(mockPlayers[0].released).toBe(true);
  expect(peekAudioDuration(uri)).toBeNull();
});

test('a player that never loads is given up on without remembering it', async () => {
  jest.useFakeTimers();
  try {
    const uri = 'https://box/view?filename=slow.wav';
    const probe = probeAudioDuration(uri);
    jest.advanceTimersByTime(15_000);
    expect(await probe).toBeNull();
    expect(mockPlayers[0].released).toBe(true);
    expect(peekAudioDuration(uri)).toBeUndefined();
  } finally {
    jest.useRealTimers();
  }
});

test('playback reports time and end, plays one file at a time, and releases', () => {
  const events = { onTime: jest.fn(), onPlaying: jest.fn(), onEnd: jest.fn(), onError: jest.fn() };
  const first = createAudioPlayback('file:///a.mp3', events);
  const second = createAudioPlayback('file:///b.mp3', events);
  const [a, b] = mockPlayers;

  first.play();
  expect(a.playing).toBe(true);
  second.play();
  expect(a.playing).toBe(false);
  expect(b.playing).toBe(true);

  b.emit('timeUpdate', { currentTime: 1.5 });
  expect(events.onTime).toHaveBeenLastCalledWith(1.5);
  b.emit('sourceLoad', { duration: 9 });
  expect(peekAudioDuration('file:///b.mp3')).toBe(9);
  b.currentTime = 9;
  b.emit('playToEnd');
  expect(b.playing).toBe(false);
  expect(b.currentTime).toBe(0);
  expect(events.onTime).toHaveBeenLastCalledWith(0);
  expect(events.onEnd).toHaveBeenCalled();

  second.release();
  second.release();
  expect(b.released).toBe(true);
  b.emit('timeUpdate', { currentTime: 3 });
  expect(events.onTime).toHaveBeenLastCalledWith(0);
  first.release();
});
