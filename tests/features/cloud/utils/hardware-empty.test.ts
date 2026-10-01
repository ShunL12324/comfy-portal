import { hardwareEmptyReason } from '@/features/cloud/utils/hardware-empty';

const keys = (vast: boolean, runpod: boolean) => ({ vast, runpod });

test('a provider without an API key is reported as not connected', () => {
  expect(hardwareEmptyReason({ filter: 'runpod', keys: keys(true, false), unavailable: [] })).toEqual({
    reason: 'no-key',
    providers: ['runpod'],
  });
  expect(hardwareEmptyReason({ filter: 'vast', keys: keys(false, true), unavailable: [] })).toEqual({
    reason: 'no-key',
    providers: ['vast'],
  });
});

test('the All view is only unconnected when no provider has a key', () => {
  expect(hardwareEmptyReason({ filter: 'all', keys: keys(false, false), unavailable: [] })).toEqual({
    reason: 'no-key',
    providers: ['vast', 'runpod'],
  });
  expect(hardwareEmptyReason({ filter: 'all', keys: keys(true, false), unavailable: [] })).toEqual({
    reason: 'no-match',
  });
});

test('a failed request on a connected provider is reported as a failure', () => {
  expect(hardwareEmptyReason({ filter: 'runpod', keys: keys(false, true), unavailable: ['runpod'] })).toEqual({
    reason: 'failed',
    providers: ['runpod'],
  });
  expect(hardwareEmptyReason({ filter: 'all', keys: keys(true, true), unavailable: ['vast'] })).toEqual({
    reason: 'failed',
    providers: ['vast'],
  });
});

test('failures outside the filter do not count, and a missing key outranks a failure', () => {
  expect(hardwareEmptyReason({ filter: 'vast', keys: keys(true, true), unavailable: ['runpod'] })).toEqual({
    reason: 'no-match',
  });
  expect(hardwareEmptyReason({ filter: 'runpod', keys: keys(true, false), unavailable: ['runpod'] })).toEqual({
    reason: 'no-key',
    providers: ['runpod'],
  });
});
