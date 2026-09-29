import { estimateDiskGb, totalModelBytes } from './types';
test('unknown model sizes never masquerade as a complete total', () => {
  const known = { url: 'https://example.com/model', type: 'checkpoints' as const, sizeBytes: 1024 ** 3 };
  expect(totalModelBytes([known])).toBe(1024 ** 3);
  expect(totalModelBytes([known, { ...known, sizeBytes: undefined }])).toBeUndefined();
  expect(estimateDiskGb([known])).toBeGreaterThanOrEqual(60);
});
