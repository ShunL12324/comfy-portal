import { mapWithConcurrency } from '@/utils/concurrency';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('never runs more than the limit at once, and starts items in order', async () => {
  const gates = [0, 1, 2, 3, 4].map(() => deferred<number>());
  const started: number[] = [];
  const results = mapWithConcurrency(gates, 2, (gate, index) => {
    started.push(index);
    return gate.promise;
  });
  await flush();
  expect(started).toEqual([0, 1]);
  gates[1].resolve(1);
  await flush();
  expect(started).toEqual([0, 1, 2]);
  gates[0].reject(new Error('lost'));
  await flush();
  expect(started).toEqual([0, 1, 2, 3]);
  gates[2].resolve(2);
  gates[3].resolve(3);
  gates[4].resolve(4);
  await expect(results[0]).rejects.toThrow('lost');
  await expect(Promise.all(results.slice(1))).resolves.toEqual([1, 2, 3, 4]);
});

test('results come back in input order, whatever order they finish in', async () => {
  const delays = [30, 0, 10];
  const results = mapWithConcurrency(
    delays,
    3,
    (delay, index) => new Promise((resolve) => setTimeout(() => resolve(index), delay)),
  );
  await expect(Promise.all(results)).resolves.toEqual([0, 1, 2]);
});

test('an empty list returns no promises', () => {
  expect(mapWithConcurrency([], 3, async () => 1)).toEqual([]);
});
