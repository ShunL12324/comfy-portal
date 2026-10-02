/**
 * Generation progress must survive a socket the server has stopped talking to.
 *
 * ComfyUI unregisters a clientId when any socket that used it closes
 * (Comfy-Org/ComfyUI#16010), so a reconnect under a reused id can be left open
 * but deaf. These tests drive the client with a fake WebSocket and a fake
 * server over mocked HTTP.
 */
import {
  ComfyClient,
  GenerationAbortedError,
  LIVENESS_WAIT_MS,
  WATCHDOG_DEAF_SOCKET_MS,
  WATCHDOG_SILENCE_MS,
} from '@/services/comfy-client';
import { fetchWithAuth } from '@/services/network';
import { diag } from '@/utils/diagnostics';

jest.mock('@/store/install-id', () => ({ getInstallId: () => 'install' }));
jest.mock('@/services/network', () => ({
  buildServerUrl: jest.fn(async (_ssl: unknown, _host: string, _port: string, path: string) => path),
  fetchWithAuth: jest.fn(),
}));
jest.mock('@/services/server-scheme', () => ({ resolveScheme: jest.fn(async () => 'http') }));
jest.mock('@/utils/diagnostics', () => ({ diag: jest.fn(), redactUrl: (url: string) => url }));

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen?: () => void;
  onclose?: (event: { code: number }) => void;
  onerror?: (event: unknown) => void;
  private listeners: ((event: { data: unknown }) => void)[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  get clientId() {
    return /clientId=([^&]+)/.exec(this.url)![1];
  }

  addEventListener(type: string, listener: (event: { data: unknown }) => void) {
    if (type === 'message') this.listeners.push(listener);
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(type: string, data: Record<string, unknown>) {
    for (const listener of this.listeners) listener({ data: JSON.stringify({ type, data }) });
  }

  /** What the server sends a socket it has just registered. */
  greet() {
    this.receive('status', { status: { exec_info: { queue_remaining: 0 } }, sid: this.clientId });
  }
}

const latestSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

/** A ComfyUI server reduced to what the client asks of it. */
interface FakeServer {
  prompts: { prompt_id?: string; client_id: string }[];
  history: Record<string, unknown>;
  running: string[];
  pending: string[];
  assignId?: string;
  postGate?: Promise<void>;
  historyGate?: Promise<void>;
  historyCalls: number;
}
let server: FakeServer;

const json = (data: unknown) => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) });
const queueItem = (id: string) => [0, id, {}, {}, []];

const WORKFLOW = { '1': { class_type: 'A', inputs: {} }, '2': { class_type: 'B', inputs: {} } } as any;
const PROMPT_ID = '00000000-0000-4000-8000-000000000001';

const successEntry = { outputs: {}, status: { status_str: 'success', messages: [['execution_success', {}]] } };
const errorEntry = {
  outputs: {},
  status: {
    status_str: 'error',
    messages: [['execution_error', { node_type: 'KSampler', exception_message: 'boom' }]],
  },
};

beforeEach(() => {
  jest.useFakeTimers();
  FakeWebSocket.instances = [];
  (global as any).WebSocket = FakeWebSocket;
  server = { prompts: [], history: {}, running: [], pending: [], historyCalls: 0 };
  (diag as jest.Mock).mockClear();
  (fetchWithAuth as jest.Mock).mockReset().mockImplementation(async (url: string, _token: unknown, init?: any) => {
    if (url === '/prompt') {
      const body = JSON.parse(init.body);
      server.prompts.push(body);
      await server.postGate;
      return json({ prompt_id: server.assignId ?? body.prompt_id });
    }
    if (url.startsWith('/history/')) {
      const id = url.slice('/history/'.length);
      server.historyCalls += 1;
      await server.historyGate;
      return json(server.history[id] ? { [id]: server.history[id] } : {});
    }
    if (url === '/queue') {
      return json({ queue_running: server.running.map(queueItem), queue_pending: server.pending.map(queueItem) });
    }
    throw new Error(`unexpected ${url}`);
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function makeClient() {
  return new ComfyClient({ host: 'comfy.test', port: '8188', useSSL: 'Never' });
}

/** Connect, open and register the next socket. */
async function connectLive(client: ComfyClient, connect: () => Promise<void> = () => client.connect()) {
  const connected = connect();
  await jest.advanceTimersByTimeAsync(0);
  latestSocket().open();
  await connected;
  latestSocket().greet();
  return latestSocket();
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Settle a promise into a value we can assert on without unhandled rejections. */
function outcome(promise: Promise<void>) {
  const state: { value?: 'resolved' | Error } = {};
  promise.then(
    () => (state.value = 'resolved'),
    (error) => (state.value = error),
  );
  return state;
}

describe('client ids', () => {
  test('every connection gets a fresh id, and prompts are queued under the current one', async () => {
    const client = makeClient();
    const first = await connectLive(client);
    const second = await connectLive(client, () => client.reconnect('test'));

    expect(first.clientId).toMatch(/^comfy-portal-install-/);
    expect(second.clientId).toMatch(/^comfy-portal-install-/);
    expect(second.clientId).not.toBe(first.clientId);
    expect(first.readyState).toBe(FakeWebSocket.CLOSED);
    expect(client.getClientId()).toBe(second.clientId);

    await client.queuePrompt(WORKFLOW, PROMPT_ID);
    expect(server.prompts[0].client_id).toBe(second.clientId);
  });

  test('concurrent connects share one socket', async () => {
    const client = makeClient();
    const a = client.connect();
    const b = client.connect();
    await jest.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(1);
    latestSocket().open();
    await Promise.all([a, b]);
  });

  test('a replaced socket closing does not trigger a reconnect', async () => {
    const client = makeClient();
    await connectLive(client);
    await connectLive(client, () => client.reconnect('test'));
    await jest.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});

describe('liveness before submit', () => {
  test('a registered, recently heard socket is trusted as is', async () => {
    const client = makeClient();
    await connectLive(client);
    await expect(client.ensureLive()).resolves.toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  test('a socket silent for too long is replaced, and registration is awaited', async () => {
    const client = makeClient();
    const old = await connectLive(client);
    await jest.advanceTimersByTimeAsync(31_000);

    const live = client.ensureLive();
    await jest.advanceTimersByTimeAsync(0);
    const fresh = latestSocket();
    expect(fresh).not.toBe(old);
    fresh.open();
    await jest.advanceTimersByTimeAsync(0);
    fresh.greet();
    await expect(live).resolves.toBe(true);
    expect(fresh.clientId).not.toBe(old.clientId);
  });

  test('without an initial status frame it gives up within the budget', async () => {
    const client = makeClient();
    const live = client.ensureLive();
    await jest.advanceTimersByTimeAsync(0);
    latestSocket().open();
    await jest.advanceTimersByTimeAsync(LIVENESS_WAIT_MS);
    await expect(live).resolves.toBe(false);
  });
});

describe('tracking', () => {
  test('frames that arrive before POST /prompt returns are kept', async () => {
    const client = makeClient();
    const socket = await connectLive(client);
    const gate = deferred();
    server.postGate = gate.promise;
    const onNodeComplete = jest.fn();

    const submitted = client.submitPrompt(WORKFLOW, PROMPT_ID, { onNodeComplete });
    await jest.advanceTimersByTimeAsync(0);
    socket.receive('execution_start', { prompt_id: PROMPT_ID });
    socket.receive('execution_cached', { prompt_id: PROMPT_ID, nodes: ['1'] });
    socket.receive('executed', { prompt_id: PROMPT_ID, node: '2', output: {} });
    socket.receive('executing', { prompt_id: PROMPT_ID, node: null });
    gate.resolve();

    const { promptId, completion } = await submitted;
    expect(promptId).toBe(PROMPT_ID);
    await expect(completion).resolves.toBeUndefined();
    expect(onNodeComplete.mock.calls).toEqual([
      ['1', 2, 1],
      ['2', 2, 2],
    ]);
  });

  test('a server that assigns its own prompt id is followed', async () => {
    const client = makeClient();
    const socket = await connectLive(client);
    server.assignId = 'server-id';

    const { promptId, completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    expect(promptId).toBe('server-id');
    socket.receive('executing', { prompt_id: 'server-id', node: null });
    await expect(completion).resolves.toBeUndefined();
  });

  test('a rejected prompt leaves nothing tracked', async () => {
    const client = makeClient();
    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({ ok: false, text: async () => 'invalid' });
    await expect(client.submitPrompt(WORKFLOW, PROMPT_ID, {})).rejects.toThrow('invalid');
    expect(client.isGenerating()).toBe(false);
  });
});

describe('watchdog', () => {
  test('a deaf socket is caught by polling history, which resolves the run', async () => {
    const client = makeClient();
    await connectLive(client);
    const { completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    const result = outcome(completion);

    await jest.advanceTimersByTimeAsync(WATCHDOG_SILENCE_MS - 5_000);
    expect(server.historyCalls).toBe(0);

    server.history[PROMPT_ID] = successEntry;
    await jest.advanceTimersByTimeAsync(10_000);
    expect(result.value).toBe('resolved');
    expect(client.isGenerating()).toBe(false);
  });

  test('a run that failed on the server rejects with its error', async () => {
    const client = makeClient();
    await connectLive(client);
    const { completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    const result = outcome(completion);

    server.history[PROMPT_ID] = errorEntry;
    await jest.advanceTimersByTimeAsync(WATCHDOG_SILENCE_MS + 5_000);
    expect(result.value).toBeInstanceOf(Error);
    expect(result.value).not.toBeInstanceOf(GenerationAbortedError);
    expect((result.value as Error).message).toBe('[KSampler] boom');
  });

  test('frames about the prompt hold the poll off', async () => {
    const client = makeClient();
    const socket = await connectLive(client);
    await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    for (let i = 0; i < 6; i++) {
      await jest.advanceTimersByTimeAsync(5_000);
      socket.receive('progress', { prompt_id: PROMPT_ID, value: i, max: 10 });
    }
    expect(server.historyCalls).toBe(0);
  });

  test('a still-running prompt on a silent socket gets a new socket under a new id', async () => {
    const client = makeClient();
    const old = await connectLive(client);
    const { completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    const result = outcome(completion);
    server.running = [PROMPT_ID];

    // Quiet nodes are normal: a merely quiet socket is polled, not replaced.
    await jest.advanceTimersByTimeAsync(WATCHDOG_SILENCE_MS + 5_000);
    expect(server.historyCalls).toBeGreaterThan(0);
    expect(FakeWebSocket.instances).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(WATCHDOG_DEAF_SOCKET_MS + 15_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(old.readyState).toBe(FakeWebSocket.CLOSED);
    expect(latestSocket().clientId).not.toBe(old.clientId);
    expect(result.value).toBeUndefined();

    // The new id never hears about the old prompt; the watchdog still finishes it.
    latestSocket().open();
    server.running = [];
    server.history[PROMPT_ID] = successEntry;
    await jest.advanceTimersByTimeAsync(60_000);
    expect(result.value).toBe('resolved');
  });

  test('socket completion and watchdog completion racing resolve the run once', async () => {
    const client = makeClient();
    const socket = await connectLive(client);
    const { completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    const result = outcome(completion);

    // The poll is in flight when the socket's completion lands.
    const historyGate = deferred();
    server.historyGate = historyGate.promise;
    server.history[PROMPT_ID] = errorEntry;
    await jest.advanceTimersByTimeAsync(WATCHDOG_SILENCE_MS + 5_000);
    expect(server.historyCalls).toBe(1);
    socket.receive('executing', { prompt_id: PROMPT_ID, node: null });
    historyGate.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(result.value).toBe('resolved');
    const resolutions = (diag as jest.Mock).mock.calls.filter(
      ([scope, event, data]) => scope === 'track' && event === 'resolved' && data.promptId === PROMPT_ID,
    );
    expect(resolutions).toHaveLength(1);
  });
});

describe('background and foreground', () => {
  test('suspend closes the socket without reconnecting; resume replaces it and polls at once', async () => {
    const client = makeClient();
    const old = await connectLive(client);
    const { completion } = await client.submitPrompt(WORKFLOW, PROMPT_ID, {});
    const result = outcome(completion);

    client.suspend();
    expect(old.readyState).toBe(FakeWebSocket.CLOSED);
    await jest.advanceTimersByTimeAsync(120_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(server.historyCalls).toBe(0);
    expect(result.value).toBeUndefined();

    server.history[PROMPT_ID] = successEntry;
    void client.resume();
    await jest.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(latestSocket().clientId).not.toBe(old.clientId);
    expect(result.value).toBe('resolved');
  });
});
