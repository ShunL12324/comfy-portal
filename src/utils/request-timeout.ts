/** React Native's AbortSignal polyfill lacks the browser static timeout/any helpers. */
export async function withRequestTimeout<T>(
  read: (signal: AbortSignal) => Promise<T>,
  milliseconds: number,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, milliseconds);
  try {
    return await read(controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }
}
