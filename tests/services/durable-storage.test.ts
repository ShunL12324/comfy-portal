import { createDurableStorage } from '@/services/durable-storage';
test('commit waits for serialized writes and leaves the newest snapshot on disk', async () => {
  let release!: () => void;
  const first = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: string[] = [];
  const storage = createDurableStorage({
    getItem: () => null,
    removeItem: () => {},
    setItem: async (_key, value) => {
      if (value === 'first') await first;
      writes.push(value);
    },
  });
  void storage.setItem('index', 'first');
  void storage.setItem('index', 'second');
  const committed = jest.fn();
  const pending = storage.flush().then(committed);
  await Promise.resolve();
  expect(committed).not.toHaveBeenCalled();
  release();
  await pending;
  expect(writes).toEqual(['first', 'second']);
});
test('storage failure cannot be mistaken for a completed commit', async () => {
  const storage = createDurableStorage({
    getItem: () => null,
    removeItem: () => {},
    setItem: async () => {
      throw new Error('disk unavailable');
    },
  });
  await storage.setItem('index', 'result');
  await expect(storage.flush()).rejects.toThrow('disk unavailable');
});
