import {
  VHS_FORMATS,
  VHS_FORMAT_WIDGETS,
  formatWidgetTitle,
} from '@/features/comfy-node/components/node/types/video-helper-suite/vhs-video-formats';
import { optionWidgetUpdates } from '@/features/comfy-node/utils/schema-inputs';

describe('VHS format widgets', () => {
  it('cover every offline format, without gifski', () => {
    expect(VHS_FORMATS).toContain('video/h264-mp4');
    expect(VHS_FORMATS).not.toContain('video/gifski');
    expect(Object.keys(VHS_FORMAT_WIDGETS['video/nvenc_h264-mp4'])).toEqual([
      'pix_fmt',
      'bitrate',
      'megabit',
      'save_metadata',
    ]);
  });

  it('title bitrate with the unit megabit picks', () => {
    expect(formatWidgetTitle('bitrate', { megabit: true })).toBe('Bitrate (Mbit/s)');
    expect(formatWidgetTitle('bitrate', { megabit: false })).toBe('Bitrate (kbit/s)');
    expect(formatWidgetTitle('bitrate', {})).toBe('Bitrate (Mbit/s)');
    expect(formatWidgetTitle('some_new_flag', {})).toBe('Some new flag');
  });

  it('switch an h264 workflow to NVENC like the desktop UI', () => {
    const inputs = {
      format: 'video/h264-mp4',
      frame_rate: 24,
      pix_fmt: 'yuv420p',
      crf: 19,
      save_metadata: false,
      trim_to_audio: false,
    };
    expect(optionWidgetUpdates(inputs, 'format', 'video/nvenc_h264-mp4', VHS_FORMAT_WIDGETS)).toEqual({
      format: 'video/nvenc_h264-mp4',
      crf: undefined,
      trim_to_audio: undefined,
      bitrate: 10,
      megabit: true,
    });
  });
});
