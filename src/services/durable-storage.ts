import type { StateStorage } from 'zustand/middleware';

/** Serialize persistence and expose an explicit commit boundary for external side effects. */
export function createDurableStorage(base: StateStorage) {
  let tail: Promise<void> = Promise.resolve();
  let failure: unknown;
  let latestWrite: (() => unknown) | undefined;
  const enqueue = (write: () => unknown) => {
    latestWrite = write;
    tail = tail.then(async () => {
      try {
        await write();
        failure = undefined;
      } catch (error) {
        failure = error;
      }
    });
    return tail;
  };
  return {
    getItem: (name: string) => base.getItem(name),
    setItem: (name: string, value: string) => enqueue(() => base.setItem(name, value)),
    removeItem: (name: string) => enqueue(() => base.removeItem(name)),
    flush: async () => {
      let observed: Promise<void>;
      do {
        observed = tail;
        await observed;
      } while (observed !== tail);
      if (failure && latestWrite) {
        await enqueue(latestWrite);
        if (failure) throw failure;
      }
    },
  };
}
