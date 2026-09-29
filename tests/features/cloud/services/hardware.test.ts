import { loadHardware } from '@/features/cloud/services/hardware';
import { searchOffers, verifyApiKey } from '@/services/vast';
import { getRunPodBalance, searchRunPodOffers } from '@/services/runpod';
jest.mock('@/services/vast', () => ({ searchOffers: jest.fn(), verifyApiKey: jest.fn() }));
jest.mock('@/services/runpod', () => ({ searchRunPodOffers: jest.fn(), getRunPodBalance: jest.fn() }));
test('provider-specific metrics and missing balances stay distinct', async () => {
  (searchOffers as jest.Mock).mockResolvedValue([
    { id: 7, gpuName: 'GPU', numGpus: 2, gpuRamGb: 24, pricePerHour: 0.7, geolocation: 'US', inetDown: 500 },
  ]);
  (verifyApiKey as jest.Mock).mockRejectedValue(new Error('Balance unavailable'));
  (searchRunPodOffers as jest.Mock).mockResolvedValue([
    { id: 'GPU', gpuName: 'GPU', gpuRamGb: 24, pricePerHour: 0.3, stockStatus: 'High' },
  ]);
  (getRunPodBalance as jest.Mock).mockResolvedValue(0);
  const result = await loadHardware(
    { vastApiKey: 'test-vast', runpodApiKey: 'test-runpod', civitaiApiKey: '', huggingFaceToken: '' },
    80,
  );
  expect(result.balances).toEqual({ runpod: 0 });
  expect(result.offers[0]).toMatchObject({ provider: 'vast', gpuCount: 2, priceScope: 'instance', downloadMbps: 500 });
  expect(result.offers[1]).toMatchObject({ provider: 'runpod', gpuCount: 1, priceScope: 'gpu-starting' });
  expect(result.offers[1]).not.toHaveProperty('downloadMbps');
  expect(result.errors).toEqual(['vast: Balance could not be loaded.']);
});
