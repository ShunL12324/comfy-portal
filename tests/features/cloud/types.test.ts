import { diskHint, planDisk, totalModelBytes, type EnvironmentModel } from '@/features/cloud/types';
const model = (sizeBytes?: number): EnvironmentModel => ({ url: 'https://example.com/m', type: 'checkpoints', sizeBytes });
const GB = 1024 ** 3;
test('unknown model sizes never masquerade as a complete total', () => {
  expect(totalModelBytes([model(GB)])).toBe(GB);
  expect(totalModelBytes([model(GB), model()])).toBeUndefined();
});
test('the disk floor is fixed; known sizes only suggest a default on the stepper grid', () => {
  expect(planDisk([])).toEqual({ minGb: 60, defaultGb: 60, knownGb: 0, unknownCount: 0 });
  expect(planDisk([model(65.2 * GB), model()])).toEqual({ minGb: 60, defaultGb: 110, knownGb: 66, unknownCount: 1 });
  expect(planDisk([model(-1), model(Number.NaN)])).toMatchObject({ minGb: 60, defaultGb: 60, unknownCount: 2 });
});
test('the disk hint says what is known and what is not', () => {
  expect(diskHint(planDisk([]))).toBe('Choose room for extensions and outputs.');
  expect(diskHint(planDisk([model(), model()]))).toBe(
    '2 models have unknown sizes; choose enough disk for them and outputs.',
  );
  expect(diskHint(planDisk([model(7 * GB)]))).toBe('Models need about 7 GB; leave room for outputs.');
  expect(diskHint(planDisk([model(7 * GB), model()]))).toBe(
    'Known models need about 7 GB; 1 model has an unknown size. Choose enough disk for all of them.',
  );
});
