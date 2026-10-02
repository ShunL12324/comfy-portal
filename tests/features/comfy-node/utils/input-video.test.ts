import {
  describeVideo,
  estimateLoadedFrames,
  formatDuration,
  inputFileUrl,
  inputFileVersion,
  inputStillKey,
  isUploadCancelled,
  parseVideoInfo,
  previewKindFor,
  readLoadParams,
  splitInputPath,
  videoFieldState,
  videoInfoUrl,
} from '@/features/comfy-node/utils/input-video';

describe('inputFileUrl', () => {
  const base = 'https://box.example:8188/view';

  it('serves an input-folder file through /view without re-encoding', () => {
    const url = new URL(inputFileUrl(base, 'clip.mp4'));
    expect(url.origin + url.pathname).toBe(base);
    expect(url.searchParams.get('filename')).toBe('clip.mp4');
    expect(url.searchParams.get('type')).toBe('input');
    expect(url.searchParams.get('subfolder')).toBe('');
    expect(url.searchParams.has('preview')).toBe(false);
    expect(url.searchParams.has('token')).toBe(false);
  });

  it('adds the token for players that cannot send headers', () => {
    const url = new URL(inputFileUrl(base, 'clip.mp4', 'secret token'));
    expect(url.searchParams.get('token')).toBe('secret token');
  });

  it('is stable, so the cached poster frame is found again', () => {
    expect(inputFileUrl(base, 'clip.mp4', 't')).toBe(inputFileUrl(base, 'clip.mp4', 't'));
  });

  it('splits a subfolder path and encodes awkward names', () => {
    const url = new URL(inputFileUrl(base, 'my clips/a & b.mov'));
    expect(url.searchParams.get('filename')).toBe('a & b.mov');
    expect(url.searchParams.get('subfolder')).toBe('my clips');
  });

  it('asks VHS for metadata on the same file', () => {
    const url = new URL(videoInfoUrl('http://h:1/vhs/queryvideo', 'sub/x.webm'));
    expect(url.pathname).toBe('/vhs/queryvideo');
    expect(url.searchParams.get('filename')).toBe('x.webm');
    expect(url.searchParams.get('subfolder')).toBe('sub');
    expect(url.searchParams.get('type')).toBe('input');
  });
});

describe('input file versions and still keys', () => {
  const base = 'https://box.example:8188/view';
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

  it("reads size and modification time from /view's headers", () => {
    const version = inputFileVersion(
      headers({ 'content-length': '1048576', 'last-modified': 'Fri, 02 Oct 2026 10:00:00 GMT' }),
    );
    expect(version).toBe('1048576@Fri, 02 Oct 2026 10:00:00 GMT');
    expect(inputFileVersion(headers({ 'content-length': '10' }))).toBe('10@');
    expect(inputFileVersion(headers({}))).toBeNull();
  });

  it('keys a still by the file without its token, and by its version', () => {
    const key = inputStillKey(base, 'clips/a.mp4', '10@x');
    expect(key.startsWith(inputFileUrl(base, 'clips/a.mp4'))).toBe(true);
    expect(key).not.toContain('token');
    expect(key).toMatch(/#10@x$/);
    expect(inputStillKey(base, 'clips/a.mp4', '11@y')).not.toBe(key);
    expect(inputStillKey(base, 'clips/a.mp4', null)).toBe(inputFileUrl(base, 'clips/a.mp4'));
  });
});

describe('splitInputPath', () => {
  it('leaves a bare filename alone', () => {
    expect(splitInputPath('a.mp4')).toEqual({ filename: 'a.mp4', subfolder: '' });
  });
  it('uses the last slash', () => {
    expect(splitInputPath('a/b/c.mp4')).toEqual({ filename: 'c.mp4', subfolder: 'a/b' });
  });
});

describe('videoFieldState', () => {
  const files = ['a.mp4', 'b.mov'];

  it('is empty with no filename', () => {
    expect(videoFieldState('', files, null)).toEqual({ kind: 'empty' });
    expect(videoFieldState(undefined, files, null)).toEqual({ kind: 'empty' });
  });

  it('is selected when the server lists the file', () => {
    expect(videoFieldState('a.mp4', files, null)).toEqual({ kind: 'selected', filename: 'a.mp4' });
  });

  it('trusts the value while the server list is unknown', () => {
    expect(videoFieldState('z.mp4', undefined, null)).toEqual({ kind: 'selected', filename: 'z.mp4' });
  });

  it('is missing when the server does not list the file', () => {
    expect(videoFieldState('z.mp4', files, null)).toEqual({ kind: 'missing', filename: 'z.mp4' });
  });

  it('shows an upload over whatever it replaces, even a missing file', () => {
    expect(videoFieldState('z.mp4', files, 0.4)).toEqual({ kind: 'uploading', progress: 0.4, filename: 'z.mp4' });
    expect(videoFieldState('', files, 0)).toEqual({ kind: 'uploading', progress: 0, filename: undefined });
  });

  it('falls back to the previous selection once an upload is cancelled', () => {
    expect(videoFieldState('a.mp4', files, 0.7).kind).toBe('uploading');
    expect(videoFieldState('a.mp4', files, null)).toEqual({ kind: 'selected', filename: 'a.mp4' });
  });

  it('recognises a cancelled upload', () => {
    expect(isUploadCancelled(new Error('Upload canceled'))).toBe(true);
    expect(isUploadCancelled(new Error('Failed to upload image (500)'))).toBe(false);
    expect(isUploadCancelled('canceled')).toBe(false);
  });
});

describe('previewKindFor', () => {
  it('plays MP4 and MOV everywhere', () => {
    for (const os of ['ios', 'android', 'web']) {
      expect(previewKindFor('a.MP4', os)).toBe('video');
      expect(previewKindFor('a.mov', os)).toBe('video');
    }
  });
  it('shows a GIF as an animated image', () => {
    expect(previewKindFor('a.gif', 'ios')).toBe('image');
  });
  it('has no preview for WebM and Matroska on iOS only', () => {
    expect(previewKindFor('a.webm', 'ios')).toBe('none');
    expect(previewKindFor('a.mkv', 'ios')).toBe('none');
    expect(previewKindFor('a.webm', 'android')).toBe('video');
    expect(previewKindFor('a.webm', 'web')).toBe('video');
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(3.2)).toBe('0:03');
    expect(formatDuration(760)).toBe('12:40');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(-1)).toBe('0:00');
  });
});

describe('parseVideoInfo', () => {
  it('reads the source block', () => {
    expect(parseVideoInfo({ source: { fps: 24, duration: 3, size: [320, 240], frames: 72 }, loaded: {} })).toEqual({
      duration: 3,
      fps: 24,
      width: 320,
      height: 240,
    });
  });
  it('rejects an empty or broken answer', () => {
    expect(parseVideoInfo({})).toBeNull();
    expect(parseVideoInfo(null)).toBeNull();
    expect(parseVideoInfo({ source: { fps: 0, duration: 3 } })).toBeNull();
  });
  it('tolerates a missing size', () => {
    expect(parseVideoInfo({ source: { fps: 30, duration: 1 } })).toEqual({
      duration: 1,
      fps: 30,
      width: undefined,
      height: undefined,
    });
  });
});

describe('loaded frames', () => {
  const source = { duration: 3, fps: 24, width: 320, height: 240 };

  it('reads every frame by default', () => {
    expect(estimateLoadedFrames(source, {})).toBe(72);
  });
  it('applies start time and duration (Load Video Trim Seek)', () => {
    expect(estimateLoadedFrames(source, { startTime: 1, duration: 0 })).toBe(48);
    expect(estimateLoadedFrames(source, { startTime: 1, duration: 0.5 })).toBe(12);
  });
  it('applies skip, cap, rate and nth (Load Video)', () => {
    expect(estimateLoadedFrames(source, { skipFirstFrames: 24 })).toBe(48);
    expect(estimateLoadedFrames(source, { frameLoadCap: 10 })).toBe(10);
    expect(estimateLoadedFrames(source, { forceRate: 8 })).toBe(24);
    expect(estimateLoadedFrames(source, { selectEveryNth: 2 })).toBe(36);
    expect(estimateLoadedFrames(source, { selectEveryNth: 5 })).toBe(15);
  });
  it('never goes negative', () => {
    expect(estimateLoadedFrames(source, { startTime: 10 })).toBe(0);
  });

  it('reads trim settings from node inputs, giving up when one is wired', () => {
    expect(readLoadParams({ start_time: 1, duration: '0.5', video: 'a.mp4' })).toEqual({ startTime: 1, duration: 0.5 });
    expect(readLoadParams({ start_time: ['12', 0] })).toBeNull();
  });

  it('describes size, rate and the estimate', () => {
    expect(describeVideo(source, {})).toBe('320×240 · 24 fps · ≈72 frames');
    expect(describeVideo({ duration: 1, fps: 29.97 }, null)).toBe('29.97 fps');
    expect(describeVideo(source, { frameLoadCap: 1 })).toBe('320×240 · 24 fps · ≈1 frame');
  });
});
