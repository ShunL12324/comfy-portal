import { audioPlayableOn, audioProgress, audioTimeLabel } from '@/features/comfy-node/utils/input-audio';

describe('audioPlayableOn', () => {
  it('plays the common formats everywhere', () => {
    for (const name of ['a.mp3', 'a.wav', 'a.m4a', 'a.flac', 'clip.mp4', 'A.MP3']) {
      expect(audioPlayableOn(name, 'ios')).toBe(true);
      expect(audioPlayableOn(name, 'android')).toBe(true);
    }
  });

  it("leaves out what the device's player cannot read", () => {
    for (const name of ['a.ogg', 'a.opus', 'a.webm', 'a.mkv', 'a.wma']) expect(audioPlayableOn(name, 'ios')).toBe(false);
    expect(audioPlayableOn('a.ogg', 'android')).toBe(true);
    expect(audioPlayableOn('a.wma', 'android')).toBe(false);
    expect(audioPlayableOn('a.ogg', 'web')).toBe(true);
  });
});

describe('audioTimeLabel', () => {
  it('shows the length before playing, and the position against it after', () => {
    expect(audioTimeLabel(null, 63)).toBe('1:03');
    expect(audioTimeLabel(12.4, 63)).toBe('0:12 / 1:03');
  });

  it('copes with an unknown length', () => {
    expect(audioTimeLabel(null, undefined)).toBe('');
    expect(audioTimeLabel(null, null)).toBe('');
    expect(audioTimeLabel(5, null)).toBe('0:05');
  });
});

test('audioProgress is a clamped fraction, 0 without a length', () => {
  expect(audioProgress(15, 60)).toBe(0.25);
  expect(audioProgress(70, 60)).toBe(1);
  expect(audioProgress(null, 60)).toBe(0);
  expect(audioProgress(10, null)).toBe(0);
});
