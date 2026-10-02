import { normalizeInputSpec, normalizeSchema, resolveInputSpec } from '@/services/node-schema';

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
