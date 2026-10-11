import { AppState } from 'react-native';
import { act, create } from 'react-test-renderer';
import { useLaunchPoller } from '@/features/cloud/hooks/use-launch-poller';
import { advanceLaunch } from '@/features/cloud/services/provision';

const launches: { id: string; provider: string; stage: string }[] = [];

jest.mock('@/features/cloud/stores/credentials-store', () => {
  const state = { hydrated: true, vastApiKey: 'key', runpodApiKey: '' };
  const useCloudCredentialsStore = (selector: (s: typeof state) => unknown) => selector(state);
  useCloudCredentialsStore.getState = () => state;
  return { useCloudCredentialsStore };
});
jest.mock('@/features/cloud/stores/provisioning-store', () => ({
  useProvisioningStore: { getState: () => ({ active: () => launches }) },
}));
jest.mock('@/features/cloud/services/provision', () => ({ advanceLaunch: jest.fn() }));

function Poller() {
  useLaunchPoller();
  return null;
}

/** Polls made in the next `ms`. */
async function ticksIn(ms: number) {
  const before = (advanceLaunch as jest.Mock).mock.calls.length;
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  return (advanceLaunch as jest.Mock).mock.calls.length - before;
}

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  launches.splice(0);
  (advanceLaunch as jest.Mock).mockReset().mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

test('polls every 2 s until the supervisor answers, then every 4 s', async () => {
  launches.push({ id: 'vast:1', provider: 'vast', stage: 'placing' });
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<Poller />);
  });
  expect(advanceLaunch).toHaveBeenCalledTimes(1); // at once on mount

  expect(await ticksIn(8_000)).toBe(4);
  launches[0].stage = 'booting';
  expect(await ticksIn(8_000)).toBe(4);
  launches[0].stage = 'installing';
  // The tick already scheduled at 2 s runs, then the cadence is 4 s.
  expect(await ticksIn(2_000)).toBe(1);
  expect(await ticksIn(16_000)).toBe(4);
  act(() => renderer.unmount());
});

test('a slow round trip does not stretch the cadence, and never overlaps the next', async () => {
  launches.push({ id: 'vast:1', provider: 'vast', stage: 'placing' });
  let inFlight = 0;
  let overlapped = false;
  (advanceLaunch as jest.Mock).mockImplementation(async () => {
    inFlight += 1;
    overlapped ||= inFlight > 1;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    inFlight -= 1;
  });
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<Poller />);
  });
  // Starts 2 s apart although each takes 1.5 s: 0, 2, 4, 6, 8 (+ the one at mount).
  expect(await ticksIn(8_100)).toBe(4);
  expect(overlapped).toBe(false);
  act(() => renderer.unmount());
});

test('a dropped poll is not a failed launch: polling carries on', async () => {
  launches.push({ id: 'vast:1', provider: 'vast', stage: 'placing' });
  (advanceLaunch as jest.Mock).mockRejectedValue(new Error('Network request failed'));
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<Poller />);
  });
  expect(await ticksIn(6_000)).toBe(3);
  act(() => renderer.unmount());
});
