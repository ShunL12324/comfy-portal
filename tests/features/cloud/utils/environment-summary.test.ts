import { environmentSize, environmentSummary } from '@/features/cloud/utils/environment-summary';
import { counted } from '@/utils/counted';
import type { EnvironmentModel } from '@/features/cloud/types';

const model = (sizeBytes?: number): EnvironmentModel => ({ url: 'https://example.com/m.safetensors', type: 'checkpoints', sizeBytes });

describe('counted', () => {
  it('picks the singular for exactly one', () => {
    expect(counted(1, 'model', 'models')).toEqual({ count: 1, label: 'model', text: '1 model' });
    expect(counted(0, 'model', 'models')).toEqual({ count: 0, label: 'models', text: '0 models' });
    expect(counted(2, 'model', 'models')).toEqual({ count: 2, label: 'models', text: '2 models' });
  });
});

describe('environmentSize', () => {
  it('is absent when there is nothing to size', () => {
    expect(environmentSize([])).toBeUndefined();
  });
  it('sums known sizes as a mono readout', () => {
    expect(environmentSize([model(2 * 1024 ** 3), model(512 * 1024 ** 2)])).toEqual({ text: '2.5 GB', mono: true });
  });
  it('refuses to present a partial sum as a total', () => {
    expect(environmentSize([model(2 * 1024 ** 3), model()])).toEqual({ text: 'Size unavailable', mono: false });
  });
  it('treats an all-zero total as unknown rather than printing an empty readout', () => {
    expect(environmentSize([model(0)])).toEqual({ text: 'Size unavailable', mono: false });
  });
});

describe('environmentSummary', () => {
  it('describes counts, size and the spoken hint together', () => {
    const summary = environmentSummary({ models: [model(1024 ** 3)], extensions: [], workflows: [{ name: 'a', data: {} as any }, { name: 'b', data: {} as any }] });
    expect(summary.models).toEqual({ count: 1, label: 'model', text: '1 model' });
    expect(summary.extensions).toEqual({ count: 0, label: 'extensions', text: '0 extensions' });
    expect(summary.workflows).toEqual({ count: 2, label: 'workflows', text: '2 workflows' });
    expect(summary.size).toEqual({ text: '1.0 GB', mono: true });
    expect(summary.hint).toBe('1 model, 0 extensions, 2 workflows, 1.0 GB');
  });
  it('omits the size from the hint when it is absent', () => {
    expect(environmentSummary({ models: [], extensions: [], workflows: [] }).hint).toBe('0 models, 0 extensions, 0 workflows');
  });
});
