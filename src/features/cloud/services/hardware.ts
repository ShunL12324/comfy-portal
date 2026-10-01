import { searchOffers, verifyApiKey } from '@/services/vast';
import { getRunPodBalance, searchRunPodOffers } from '@/services/runpod';
import type { CloudCredentials } from '../stores/credentials-store';
import type { CloudProvider, HardwareSelection } from '../types';

export interface HardwareOffer extends HardwareSelection {
  location?: string;
  downloadMbps?: number;
  stock?: string;
  systemMemoryGb?: number;
  vcpu?: number;
}
export interface HardwareCatalog {
  offers: HardwareOffer[];
  balances: Partial<Record<CloudProvider, number>>;
  errors: string[];
  /** Providers whose inventory request failed, as opposed to answering with no offers. */
  unavailable: CloudProvider[];
}
export async function loadHardware(credentials: CloudCredentials, diskGb: number): Promise<HardwareCatalog> {
  const providers = (['vast', 'runpod'] as const).filter((provider) =>
    provider === 'vast' ? credentials.vastApiKey : credentials.runpodApiKey,
  );
  const results = await Promise.all(
    providers.map(async (provider) => {
      const [inventory, account] = await Promise.allSettled(
        provider === 'vast'
          ? ([
              searchOffers(credentials.vastApiKey, { gpuName: '', minDiskGb: diskGb, minCuda: 12.8, limit: 40 }),
              verifyApiKey(credentials.vastApiKey).then((account) => account.balance),
            ] as const)
          : ([
              searchRunPodOffers(credentials.runpodApiKey, diskGb),
              getRunPodBalance(credentials.runpodApiKey),
            ] as const),
      );
      const quotedAt = Date.now();
      const offers: HardwareOffer[] =
        inventory.status !== 'fulfilled'
          ? []
          : inventory.value.map((offer) =>
              'numGpus' in offer
                ? {
                    provider: 'vast',
                    offerId: String(offer.id),
                    diskGb,
                    gpuName: offer.gpuName,
                    gpuCount: offer.numGpus,
                    memoryGb: offer.gpuRamGb,
                    pricePerHour: offer.pricePerHour,
                    quotedAt,
                    priceScope: 'instance',
                    location: offer.geolocation,
                    downloadMbps: offer.inetDown,
                  }
                : {
                    provider: 'runpod',
                    offerId: offer.id,
                    diskGb,
                    gpuName: offer.gpuName,
                    gpuCount: 1,
                    memoryGb: offer.gpuRamGb,
                    pricePerHour: offer.pricePerHour,
                    quotedAt,
                    priceScope: 'gpu-starting',
                    stock: offer.stockStatus,
                    systemMemoryGb: offer.memoryGb,
                    vcpu: offer.vcpu,
                  },
            );
      return {
        provider,
        offers,
        balance: account.status === 'fulfilled' ? account.value : undefined,
        inventoryFailed: inventory.status === 'rejected',
        errors: [inventory, account].flatMap((result, index) =>
          result.status === 'rejected'
            ? [provider + ': ' + (index === 0 ? 'Availability' : 'Balance') + ' could not be loaded.']
            : [],
        ),
      };
    }),
  );
  return {
    offers: results.flatMap((result) => result.offers),
    balances: Object.fromEntries(
      results
        .filter((result) => typeof result.balance === 'number' && Number.isFinite(result.balance))
        .map((result) => [result.provider, result.balance]),
    ),
    errors: results.flatMap((result) => result.errors),
    unavailable: results.filter((result) => result.inventoryFailed).map((result) => result.provider),
  };
}
