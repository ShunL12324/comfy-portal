import { RawInputSpec, normalizeInputSpec, normalizeSchema, resolveInputSpec } from '@/services/node-schema';

jest.mock('@/features/server/stores/server-store', () => ({ useServersStore: { getState: () => ({ servers: [] }) } }));
jest.mock('@/services/network', () => ({ buildServerUrl: jest.fn(), fetchWithAuth: jest.fn() }));

describe('normalizeInputSpec', () => {
  it('carries display names and the advanced flag', () => {
    expect(
      normalizeInputSpec(['FLOAT', { display_name: 'Black Point', advanced: true, min: 0, max: 1, step: 0.01 }]),
    ).toMatchObject({ kind: 'float', label: 'Black Point', advanced: true, min: 0, max: 1, step: 0.01 });
  });

  it('treats autogrow groups and typed sockets as links', () => {
    expect(normalizeInputSpec(['COMFY_AUTOGROW_V3', { template: {} }])).toEqual({ kind: 'link' });
    expect(normalizeInputSpec(['IMAGE', {}])).toEqual({ kind: 'link' });
  });
});

describe('dynamic combos', () => {
  const schema = normalizeSchema({
    input: {
      required: {
        mode: [
          'COMFY_DYNAMICCOMBO_V3',
          {
            options: [
              {
                key: 'combined',
                inputs: { required: { crop_scale: ['FLOAT', { default: 1.5, min: 0, max: 4, step: 0.05 }] } },
              },
              {
                key: 'tracked',
                inputs: {
                  required: {
                    crop_scale: ['FLOAT', { default: 1.5, min: 0, max: 2, step: 0.05 }],
                    padding: ['COMBO', { options: ['guaranteed', 'firm', 'flexible'], default: 'firm' }],
                  },
                },
              },
            ],
          },
        ],
        divisible_by: ['INT', { default: 16, min: 1 }],
      },
    },
  });

  it('become combos over their option keys, defaulting to the first', () => {
    expect(schema.inputs.mode).toMatchObject({ kind: 'combo', options: ['combined', 'tracked'], default: 'combined' });
  });

  it('resolve dotted child keys against the selected option', () => {
    expect(resolveInputSpec(schema, 'mode.crop_scale', { mode: 'combined' })).toMatchObject({ max: 4 });
    expect(resolveInputSpec(schema, 'mode.crop_scale', { mode: 'tracked' })).toMatchObject({ max: 2 });
    expect(resolveInputSpec(schema, 'mode.padding', { mode: 'tracked' })).toMatchObject({
      kind: 'combo',
      options: ['guaranteed', 'firm', 'flexible'],
    });
  });

  it('resolve nothing for children of another option or unknown keys', () => {
    expect(resolveInputSpec(schema, 'mode.padding', { mode: 'combined' })).toBeUndefined();
    expect(resolveInputSpec(schema, 'images.image0', {})).toBeUndefined();
    expect(resolveInputSpec(null, 'mode', {})).toBeUndefined();
  });

  it('still resolve plain keys directly', () => {
    expect(resolveInputSpec(schema, 'divisible_by', {})).toMatchObject({ kind: 'int', min: 1 });
  });
});

describe('per-option widgets (VHS Video Combine formats)', () => {
  // The shape VHS sends: a legacy combo whose config carries `formats`.
  const schema = normalizeSchema({
    input: {
      required: {
        frame_rate: ['FLOAT', { default: 8, min: 1, step: 1 }],
        format: [
          ['image/gif', 'image/webp', 'video/h264-mp4', 'video/ffmpeg-gif'],
          {
            formats: {
              'image/webp': [['lossless', 'BOOLEAN', { default: true }]],
              'video/h264-mp4': [
                ['pix_fmt', ['yuv420p', 'yuv420p10le']],
                ['crf', 'INT', { default: 19, min: 0, max: 100, step: 1 }],
                ['save_metadata', 'BOOLEAN', { default: true }],
              ],
              'video/ffmpeg-gif': [['dither', ['bayer', 'none'], { default: 'none' }, '[0:v] paletteuse=dither=$val']],
            },
          },
        ] as RawInputSpec,
      },
    },
  });

  it('keep each option widget list, normalised like any input', () => {
    const format = schema.inputs.format;
    if (format.kind !== 'combo') throw new Error('expected a combo');
    expect(format.options).toContain('video/h264-mp4');
    expect(Object.keys(format.widgets?.['video/h264-mp4'] ?? {})).toEqual(['pix_fmt', 'crf', 'save_metadata']);
    expect(format.widgets?.['video/h264-mp4'].crf).toMatchObject({ kind: 'int', min: 0, max: 100, default: 19 });
    expect(format.widgets?.['video/h264-mp4'].pix_fmt).toMatchObject({
      kind: 'combo',
      options: ['yuv420p', 'yuv420p10le'],
    });
    // A trailing ffmpeg template doesn't get in the way.
    expect(format.widgets?.['video/ffmpeg-gif'].dither).toMatchObject({ kind: 'combo', default: 'none' });
  });

  it('resolve a top-level widget key against the selected option', () => {
    expect(resolveInputSpec(schema, 'crf', { format: 'video/h264-mp4' })).toMatchObject({ kind: 'int', max: 100 });
    expect(resolveInputSpec(schema, 'lossless', { format: 'image/webp' })).toMatchObject({ kind: 'boolean' });
    expect(resolveInputSpec(schema, 'crf', { format: 'image/webp' })).toBeUndefined();
    expect(resolveInputSpec(schema, 'frame_rate', { format: 'video/h264-mp4' })).toMatchObject({ kind: 'float' });
  });

  it('are absent from ordinary combos', () => {
    expect(normalizeInputSpec([['a', 'b'], {}])).not.toHaveProperty('widgets');
    expect(normalizeInputSpec(['COMBO', { options: ['a'] }])).not.toHaveProperty('widgets');
  });
});
