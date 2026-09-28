import { z } from 'zod';

const API = 'https://api.runpod.io/graphql';

/** Official schema: https://graphql-spec.runpod.io/ . Keys never enter URL parameters. */
async function request<T>(apiKey: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!apiKey.trim()) throw new Error('Add your RunPod API key in Cloud accounts.');
  const response = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error('RunPod request failed (HTTP ' + response.status + ').');
  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(
      result.errors.map((error: { message?: string }) => error.message ?? 'RunPod rejected the request.').join('; '),
    );
  }
  if (!result.data) throw new Error('RunPod returned no data.');
  return result.data as T;
}

const gpuSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  memoryInGb: z.number(),
  lowestPrice: z
    .object({
      uninterruptablePrice: z.number().nonnegative().nullable(),
      stockStatus: z.string().nullable(),
      availableGpuCounts: z.array(z.number()).nullable(),
      minMemory: z.number().nullable(),
      minVcpu: z.number().nullable(),
    })
    .nullable(),
});
export interface RunPodOffer {
  id: string;
  gpuName: string;
  gpuRamGb: number;
  pricePerHour: number;
  stockStatus: string;
  memoryGb?: number;
  vcpu?: number;
}
export async function searchRunPodOffers(apiKey: string, diskGb: number): Promise<RunPodOffer[]> {
  const data = await request<{ gpuTypes: unknown[] }>(
    apiKey,
    'query($input: GpuLowestPriceInput) { gpuTypes { id displayName memoryInGb lowestPrice(input: $input) { uninterruptablePrice stockStatus availableGpuCounts minMemory minVcpu } } }',
    { input: { gpuCount: 1, secureCloud: true, supportPublicIp: true, minDisk: diskGb, minCudaVersion: '12.8' } },
  );
  return z
    .array(z.unknown())
    .parse(data.gpuTypes)
    .flatMap((item) => {
      const parsed = gpuSchema.safeParse(item);
      if (!parsed.success) return [];
      const gpu = parsed.data;
      const price = gpu.lowestPrice;
      if (
        !price ||
        price.uninterruptablePrice == null ||
        !price.availableGpuCounts?.includes(1) ||
        !price.stockStatus ||
        price.stockStatus.toLowerCase() === 'none'
      )
        return [];
      return [
        {
          id: gpu.id,
          gpuName: gpu.displayName,
          gpuRamGb: gpu.memoryInGb,
          pricePerHour: price.uninterruptablePrice,
          stockStatus: price.stockStatus,
          memoryGb: price.minMemory ?? undefined,
          vcpu: price.minVcpu ?? undefined,
        },
      ];
    })
    .sort((a, b) => a.pricePerHour - b.pricePerHour);
}
export async function getRunPodBalance(apiKey: string): Promise<number | undefined> {
  const data = await request<{ myself: { clientBalance: number | null } }>(
    apiKey,
    'query { myself { clientBalance } }',
  );
  return typeof data.myself.clientBalance === 'number' && Number.isFinite(data.myself.clientBalance)
    ? data.myself.clientBalance
    : undefined;
}

const podSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  desiredStatus: z.string(),
  costPerHr: z.number().finite().nonnegative().nullish(),
  lastStatusChange: z.string().nullish(),
  runtime: z
    .object({
      uptimeInSeconds: z.number().nullish(),
      ports: z
        .array(
          z.object({
            ip: z.string(),
            isIpPublic: z.boolean(),
            privatePort: z.number().int(),
            publicPort: z.number().int(),
            type: z.string(),
          }),
        )
        .nullish()
        .transform((value) => value ?? []),
    })
    .nullish(),
});
export type RunPodInstance = z.infer<typeof podSchema>;
const POD_FIELDS =
  'id name desiredStatus costPerHr lastStatusChange runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } }';

export async function getRunPodInstance(apiKey: string, id: string): Promise<RunPodInstance> {
  const data = await request<{ pod: RunPodInstance | null }>(
    apiKey,
    'query($input: PodFilter!) { pod(input: $input) { ' + POD_FIELDS + ' } }',
    { input: { podId: id } },
  );
  if (!data.pod) throw new Error('This RunPod instance no longer exists.');
  return podSchema.parse(data.pod);
}
export async function listRunPodInstances(apiKey: string): Promise<RunPodInstance[]> {
  const data = await request<{ myself: { pods: RunPodInstance[] } }>(
    apiKey,
    'query { myself { pods { ' + POD_FIELDS + ' } } }',
  );
  return z.array(podSchema).parse(data.myself.pods);
}
export async function createRunPodInstance(
  apiKey: string,
  options: {
    gpuTypeId: string;
    diskGb: number;
    name: string;
    image: string;
    env: Record<string, string>;
    publicKey: string;
  },
): Promise<{ id: string; costPerHr?: number | null }> {
  const data = await request<{ podFindAndDeployOnDemand: { id: string; costPerHr: number } }>(
    apiKey,
    'mutation($input: PodFindAndDeployOnDemandInput) { podFindAndDeployOnDemand(input: $input) { id costPerHr } }',
    {
      input: {
        name: options.name,
        imageName: options.image,
        cloudType: 'SECURE',
        gpuTypeId: options.gpuTypeId,
        gpuCount: 1,
        containerDiskInGb: 20,
        volumeInGb: options.diskGb,
        volumeMountPath: '/workspace',
        ports: '22/tcp,8188/tcp,8189/tcp',
        startSsh: true,
        supportPublicIp: true,
        minCudaVersion: '12.8',
        env: Object.entries({ ...options.env, CP_SSH_PUBLIC_KEY: options.publicKey }).map(([key, value]) => ({
          key,
          value,
        })),
      },
    },
  );
  if (!data.podFindAndDeployOnDemand?.id)
    throw new Error('RunPod did not return an instance id. Check your account before retrying.');
  return z
    .object({
      id: z.string().min(1),
      costPerHr: z.number().finite().nonnegative().nullish(),
    })
    .parse(data.podFindAndDeployOnDemand);
}
export async function destroyRunPodInstance(apiKey: string, id: string): Promise<void> {
  await request(apiKey, 'mutation($input: PodTerminateInput!) { podTerminate(input: $input) }', {
    input: { podId: id },
  });
}
